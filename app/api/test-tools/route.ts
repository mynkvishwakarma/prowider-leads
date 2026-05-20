import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allocateProviders } from "@/lib/allocation";
import { broadcastLeadUpdate } from "@/lib/sse";

const NAMES = [
  "Alice Johnson", "Bob Smith", "Carol White", "David Brown",
  "Eva Davis", "Frank Miller", "Grace Wilson", "Henry Moore",
  "Isabel Taylor", "Jack Anderson",
];
const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"];
const DESCS = [
  "Need urgent help with this service",
  "Looking for a professional provider",
  "Require service ASAP",
  "Please contact me at your earliest",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "BULK_LEADS") {
      // Generate 10 leads simultaneously across all 3 services
      const count = body.count ?? 10;
      const uniqueId = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

      const promises = Array.from({ length: count }, async (_, i) => {
        const serviceId = (i % 3) + 1;
        // Create guaranteed unique phone: 9 + 9 digits from counter + uniqueId
        const phone = `9${String(i).padStart(9, '0')}${uniqueId}`.slice(0, 10);
        const name = NAMES[i % NAMES.length];
        const city = CITIES[i % CITIES.length];
        const desc = DESCS[i % DESCS.length];

        try {
          const result = await prisma.$transaction(async (tx) => {
            const lead = await tx.lead.create({
              data: {
                customerName: name,
                phone,
                city,
                description: desc,
                serviceId,
              },
              include: { service: true },
            });

            const assignedIds = await allocateProviders(serviceId, lead.id, tx);
            const providers = await tx.provider.findMany({
              where: { id: { in: assignedIds } },
              select: { id: true, name: true },
            });

            return { lead, providers };
          });

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

          return { success: true, leadId: result.lead.id };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "unknown error";
          return { success: false, error: msg };
        }
      });

      const results = await Promise.allSettled(promises);
      const summary = results.map((r) =>
        r.status === "fulfilled" ? r.value : { success: false, error: "rejected" }
      );

      return NextResponse.json({ success: true, results: summary });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Test tools error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
