import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding auth data...");

  // Hash password
  const passwordHash = await bcrypt.hash("password123", 10);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: "yavuz@arkhetalent.com" },
  });

  if (existingUser) {
    console.log("✓ Test user already exists");
    return;
  }

  // Create test user with subscription
  const user = await prisma.user.create({
    data: {
      email: "yavuz@arkhetalent.com",
      passwordHash,
      firstName: "Yavuz",
      lastName: "Pullukcu",
      subscription: {
        create: {
          plan: "pro",
          maxCandidates: 100,
          maxJobs: 20,
          maxTeamMembers: 5,
          status: "active",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      },
    },
    include: { subscription: true },
  });

  console.log("✓ Test user created:");
  console.log(`  Email: ${user.email}`);
  console.log(`  Password: password123`);
  console.log(`  Plan: ${user.subscription?.plan}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("✓ Done");
  });
