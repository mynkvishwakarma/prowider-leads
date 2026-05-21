import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allocateProviders } from "@/lib/allocation";
import { broadcastLeadUpdate } from "@/lib/sse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, phone, city, serviceId, description } = body;

    // Validate required fields
    if (!customerName || !phone || !city || !serviceId || !description) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const svcId = parseInt(serviceId);
    if (isNaN(svcId)) {
      return NextResponse.json({ error: "Invalid service" }, { status: 400 });
    }

    // Validate service exists
    const service = await prisma.service.findUnique({ where: { id: svcId } });
    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Check duplicate at API level (DB unique constraint is the real guard)
    const existing = await prisma.lead.findUnique({
      where: { unique_phone_service: { phone, serviceId: svcId } },
    });
    if (existing) {
      return NextResponse.json(
        {
          error:
            "This phone number has already submitted a lead for this service.",
        },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Create lead
        const lead = await tx.lead.create({
          data: {
            customerName,
            phone,
            city,
            description,
            serviceId: svcId,
          },
          include: { service: true },
        });

        // Run allocation inside the same transaction
        // This will throw if exactly 3 providers cannot be assigned
        const assignedProviderIds = await allocateProviders(svcId, lead.id, tx);

        // Fetch provider names for response
        const providers = await tx.provider.findMany({
          where: { id: { in: assignedProviderIds } },
          select: { id: true, name: true },
        });

        return { lead, providers };
      },
      { timeout: 15000 }
    );

    // Broadcast to all SSE clients
    broadcastLeadUpdate({
      type: "NEW_LEAD",
      lead: {
        id: result.lead.id,
        customerName: result.lead.customerName,
        city: result.lead.city,
        service: result.lead.service.name,
        createdAt: result.lead.createdAt,
      },
      assignedProviders: result.providers.map((p) => p.name),
    });

    return NextResponse.json(
      {
        success: true,
        leadId: result.lead.id,
        assignedTo: result.providers.map((p) => p.name),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    // Handle allocation failure (not enough providers with quota)
    if (
      error instanceof Error &&
      error.message.includes("Allocation failed")
    ) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 503 } // Service Unavailable
      );
    }
    // Handle DB unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes("unique_phone_service")
    ) {
      return NextResponse.json(
        {
          error:
            "This phone number has already submitted a lead for this service.",
        },
        { status: 409 }
      );
    }
    console.error("Lead creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const leads = await prisma.lead.findMany({
    include: {
      service: true,
      assignments: { include: { provider: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(leads);
}
