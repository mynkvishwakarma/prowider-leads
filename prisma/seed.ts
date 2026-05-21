import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client/edge";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Upsert Services
  const service1 = await prisma.service.upsert({
    where: { name: "Service 1" },
    update: {},
    create: { name: "Service 1" },
  });
  const service2 = await prisma.service.upsert({
    where: { name: "Service 2" },
    update: {},
    create: { name: "Service 2" },
  });
  const service3 = await prisma.service.upsert({
    where: { name: "Service 3" },
    update: {},
    create: { name: "Service 3" },
  });

  console.log(`✅ Services: ${service1.name}, ${service2.name}, ${service3.name}`);

  // Upsert 8 Providers
  const providerNames = [
    "Provider 1", "Provider 2", "Provider 3", "Provider 4",
    "Provider 5", "Provider 6", "Provider 7", "Provider 8",
  ];

  for (let i = 0; i < providerNames.length; i++) {
    await prisma.provider.upsert({
      where: { name: providerNames[i] },
      update: {},
      create: {
        id: i + 1,
        name: providerNames[i],
        monthlyQuota: 10,
      },
    });
  }

  console.log("✅ 8 Providers created");

  // Initialize AllocationState for each service (round-robin index)
  for (const service of [service1, service2, service3]) {
    await prisma.allocationState.upsert({
      where: { serviceId: service.id },
      update: {},
      create: { serviceId: service.id, lastPoolIndex: 0 },
    });
  }

  console.log("✅ Allocation state initialized");
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
