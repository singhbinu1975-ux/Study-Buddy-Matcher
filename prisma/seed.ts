import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Please set your DATABASE_URL in the environment/dotenv file first.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding test study profiles...");

  // Delete existing seeded users (optional)
  await prisma.studyProfile.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Seed Alice
  const alice = await prisma.user.create({
    data: {
      id: "user_test_alice_123",
      name: "Alice Vance",
      email: "alice@example.edu",
      school: "Stanford University",
      profiles: {
        create: {
          subject: "Calculus II",
          goal: "exam_prep",
          format: "video",
          availability: JSON.stringify([
            { day: "Monday", startTime: "10:00", endTime: "12:00" },
            { day: "Thursday", startTime: "14:00", endTime: "16:00" },
          ]),
        },
      },
    },
  });

  // 2. Seed Bob
  const bob = await prisma.user.create({
    data: {
      id: "user_test_bob_456",
      name: "Bob Builder",
      email: "bob@example.edu",
      school: "Stanford University",
      profiles: {
        create: {
          subject: "Calculus II",
          goal: "homework_help",
          format: "in_person",
          location: "Main Library",
          availability: JSON.stringify([
            { day: "Monday", startTime: "11:00", endTime: "13:00" }, // Overlaps with Alice on Monday
            { day: "Wednesday", startTime: "15:00", endTime: "17:00" },
          ]),
        },
      },
    },
  });

  // 3. Seed Charlie
  const charlie = await prisma.user.create({
    data: {
      id: "user_test_charlie_789",
      name: "Charlie Brown",
      email: "charlie@example.edu",
      school: "Stanford University",
      profiles: {
        create: {
          subject: "Physics",
          goal: "general_practice",
          format: "either",
          location: "Science Center",
          availability: JSON.stringify([
            { day: "Monday", startTime: "11:00", endTime: "13:00" },
            { day: "Friday", startTime: "09:00", endTime: "11:00" },
          ]),
        },
      },
    },
  });

  console.log("Database seeded successfully!");
  console.log("Seeded Users:", { alice: alice.name, bob: bob.name, charlie: charlie.name });
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
