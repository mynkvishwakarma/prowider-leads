import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLeadUpdate } from "@/lib/sse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, idempotencyKey, providerId } = body;

    if (!idempotencyKey || !eventType) {
      return NextResponse.json(
        { error: "idempotencyKey and eventType are required" },
        { status: 400 }
      );
    }

    // Idempotency check — if already processed, return early without side effects
    const existing = await prisma.webhookEvent.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          idempotent: true,
          message: "Webhook already processed — no changes made",
          processedAt: existing.processedAt,
        },
        { status: 200 }
      );
    }

    if (eventType === "QUOTA_RESET") {
      // Reset all provider quotas to 10
      await prisma.$transaction(async (tx) => {
        // Record webhook event first (inside transaction for atomicity)
        await tx.webhookEvent.create({
          data: { idempotencyKey, eventType },
        });

        // Delete all lead assignments from the current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

        await tx.leadAssignment.deleteMany({
          where: {
            assignedAt: { gte: startOfMonth, lte: endOfMonth },
          },
        });

        // Reset all providers
        await tx.provider.updateMany({
          data: { monthlyQuota: 10 },
        });
      });

      // Broadcast quota reset to dashboards
      broadcastLeadUpdate({ type: "QUOTA_RESET" });

      return NextResponse.json({
        success: true,
        idempotent: false,
        message: "All provider quotas reset to 10",
      });
    }

    if (eventType === "PROVIDER_QUOTA_RESET") {
      // Reset individual provider quota
      if (!providerId) {
        return NextResponse.json(
          { error: "providerId is required for PROVIDER_QUOTA_RESET" },
          { status: 400 }
        );
      }

      const pId = parseInt(providerId);
      if (isNaN(pId)) {
        return NextResponse.json(
          { error: "Invalid providerId" },
          { status: 400 }
        );
      }

      // Verify provider exists
      const provider = await prisma.provider.findUnique({
        where: { id: pId },
      });

      if (!provider) {
        return NextResponse.json(
          { error: "Provider not found" },
          { status: 404 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // Record webhook event
        await tx.webhookEvent.create({
          data: { idempotencyKey, eventType },
        });

        // Delete this provider's lead assignments from the current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

        await tx.leadAssignment.deleteMany({
          where: {
            providerId: pId,
            assignedAt: { gte: startOfMonth, lte: endOfMonth },
          },
        });

        // Reset only this provider
        await tx.provider.update({
          where: { id: pId },
          data: { monthlyQuota: 10 },
        });
      });

      // Broadcast individual provider quota reset
      broadcastLeadUpdate({
        type: "PROVIDER_QUOTA_RESET",
        providerId: pId,
        providerName: provider.name,
      });

      return NextResponse.json({
        success: true,
        idempotent: false,
        message: `Provider ${provider.name} quota reset to 10`,
        providerId: pId,
      });
    }

    return NextResponse.json({ error: "Unknown eventType" }, { status: 400 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// List past webhook events
export async function GET() {
  const events = await prisma.webhookEvent.findMany({
    orderBy: { processedAt: "desc" },
    take: 20,
  });
  return NextResponse.json(events);
}
