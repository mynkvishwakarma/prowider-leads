import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

  const providers = await prisma.provider.findMany({
    orderBy: { id: "asc" },
    include: {
      leadAssignments: {
        where: {
          assignedAt: { gte: startOfMonth, lte: endOfMonth },
        },
        include: {
          lead: {
            include: { service: true },
          },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  });

  const data = providers.map((p) => ({
    id: p.id,
    name: p.name,
    monthlyQuota: p.monthlyQuota,
    leadsThisMonth: p.leadAssignments.length,
    remainingQuota: Math.max(0, p.monthlyQuota - p.leadAssignments.length),
    leads: p.leadAssignments.map((a) => ({
      assignmentId: a.id,
      leadId: a.lead.id,
      customerName: a.lead.customerName,
      city: a.lead.city,
      phone: a.lead.phone,
      service: a.lead.service.name,
      description: a.lead.description,
      assignedAt: a.assignedAt,
    })),
  }));

  return NextResponse.json(data);
}
