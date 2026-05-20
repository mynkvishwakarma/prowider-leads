/**
 * Core Lead Allocation Engine
 *
 * Rules:
 * - Service 1 → Provider 1 mandatory; pool: [2,3,4] pick 2
 * - Service 2 → Provider 5 mandatory; pool: [6,7,8] pick 2
 * - Service 3 → Provider 1 + Provider 4 mandatory; pool: [2,3,5,6,7,8] pick 1
 *
 * Fair distribution: round-robin using AllocationState.lastPoolIndex persisted in DB
 *
 * Concurrency safety:
 *   pg_advisory_xact_lock is acquired INSIDE the transaction (same connection).
 *   It is scoped to the transaction and auto-releases on commit/rollback.
 *   Two concurrent leads for the same service are serialized.
 *   Different services run in parallel without blocking each other.
 *   Works correctly with PgBouncer transaction-mode pooling (Supabase default).
 */

// Configuration
const MANDATORY_PROVIDERS: Record<number, number[]> = {
  1: [1],
  2: [5],
  3: [1, 4],
};

const POOL_PROVIDERS: Record<number, number[]> = {
  1: [2, 3, 4],
  2: [6, 7, 8],
  3: [2, 3, 5, 6, 7, 8],
};

const TOTAL_ASSIGNMENTS = 3;

/**
 * Allocate providers for a new lead.
 * Must be called inside a Prisma interactive transaction.
 * Acquires a per-service advisory lock (transaction-scoped) to prevent races.
 *
 * @param serviceId - The service ID for the lead
 * @param leadId    - The newly created lead ID
 * @param tx        - Prisma transaction client
 */
export async function allocateProviders(
  serviceId: number,
  leadId: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any
): Promise<number[]> {
  // Acquire a transaction-scoped advisory lock for this service.
  // This ensures concurrent leads for the same service are serialized
  // on the same DB connection, preventing round-robin index races.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${1000 + serviceId})`;

  const mandatoryIds = MANDATORY_PROVIDERS[serviceId] ?? [];
  const pool = POOL_PROVIDERS[serviceId] ?? [];
  const slotsNeeded = TOTAL_ASSIGNMENTS - mandatoryIds.length;

  // Fetch current month boundaries
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Fetch all relevant providers with their current-month lead counts
  const allProviderIds = [...new Set([...mandatoryIds, ...pool])];
  const providerRows = await tx.provider.findMany({
    where: { id: { in: allProviderIds } },
    select: {
      id: true,
      monthlyQuota: true,
      leadAssignments: {
        where: {
          assignedAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: { id: true },
      },
    },
  });

  const quotaMap: Record<number, { quota: number; used: number }> = {};
  for (const p of providerRows) {
    quotaMap[p.id] = {
      quota: p.monthlyQuota,
      used: p.leadAssignments.length,
    };
  }

  const hasCapacity = (id: number) => {
    const q = quotaMap[id];
    if (!q) return false;
    return q.used < q.quota;
  };

  // Collect valid mandatory providers (skip if over quota)
  const assignedIds: number[] = [];
  for (const id of mandatoryIds) {
    if (hasCapacity(id)) {
      assignedIds.push(id);
    }
  }

  // Get or create allocation state for round-robin
  let state = await tx.allocationState.findUnique({
    where: { serviceId },
  });

  if (!state) {
    state = await tx.allocationState.create({
      data: { serviceId, lastPoolIndex: 0 },
    });
  }

  let currentIndex = state.lastPoolIndex;

  // Pick from pool using round-robin, skipping over-quota providers
  const pickedFromPool: number[] = [];
  let attempts = 0;
  while (pickedFromPool.length < slotsNeeded && attempts < pool.length * 2) {
    const idx = currentIndex % pool.length;
    const candidateId = pool[idx];
    currentIndex++;
    attempts++;

    if (!assignedIds.includes(candidateId) && hasCapacity(candidateId)) {
      pickedFromPool.push(candidateId);
    }
  }

  // Persist updated round-robin index (survives server restarts)
  await tx.allocationState.update({
    where: { serviceId },
    data: { lastPoolIndex: currentIndex },
  });

  const finalProviders = [...assignedIds, ...pickedFromPool];

  // Validate exactly 3 providers are assigned (REQUIRED BY ASSIGNMENT)
  if (finalProviders.length !== TOTAL_ASSIGNMENTS) {
    throw new Error(
      `Allocation failed: Could only assign ${finalProviders.length} providers ` +
      `out of required ${TOTAL_ASSIGNMENTS}. Ensure some providers have available quota.`
    );
  }

  // Create assignment records (skipDuplicates as a safety net)
  await tx.leadAssignment.createMany({
    data: finalProviders.map((providerId) => ({ leadId, providerId })),
    skipDuplicates: true,
  });

  return finalProviders;
}
