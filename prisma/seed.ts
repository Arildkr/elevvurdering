import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { kandidatnummer: "ADM001" },
    update: {},
    create: {
      name: "Lærer Admin",
      kandidatnummer: "ADM001",
      isAdmin: true,
    },
  });

  console.log(`Admin opprettet: ${admin.name} (kandidatnummer: ${admin.kandidatnummer})`);

  // Create demo group
  const group = await prisma.group.upsert({
    where: { joinCode: "DEMO01" },
    update: {},
    create: {
      name: "Demo-klasse",
      joinCode: "DEMO01",
      adminId: admin.id,
    },
  });

  console.log(`Demo-gruppe opprettet: ${group.name} (kode: ${group.joinCode})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
