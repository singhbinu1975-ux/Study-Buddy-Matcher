import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

let prisma: PrismaClient;

const connectionString = process.env.DATABASE_URL;

if (connectionString) {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient({ adapter });
  } else {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({ adapter });
    }
    prisma = globalForPrisma.prisma;
  }
} else {
  // Fallback to standard client (useful during build or initialization when env vars might be empty)
  if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient();
  } else {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient();
    }
    prisma = globalForPrisma.prisma;
  }
}

export { prisma };
