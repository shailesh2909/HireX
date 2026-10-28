import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function seed() {
  await prisma.wallet.upsert({
    where: { userId: "organizer-1" },
    update: {},
    create: { userId: "organizer-1", balance: 1000 },
  });
  await prisma.wallet.upsert({
    where: { userId: "buyer-1" },
    update: {},
    create: { userId: "buyer-1", balance: 1000 },
  });
  await prisma.wallet.upsert({
    where: { userId: "buyer-2" },
    update: {},
    create: { userId: "buyer-2", balance: 1000 },
  });
  console.log("Wallets seeded");
  await prisma.$disconnect();
}

seed();
