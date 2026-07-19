import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

let _prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (_prisma) return _prisma;

  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    if (process.env.NODE_ENV === "production") {
      _prisma = new PrismaClient({ adapter });
    } else {
      if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient({ adapter });
      }
      _prisma = globalForPrisma.prisma;
    }
  } else {
    // Fallback to standard client (useful during build or initialization when env vars might be empty)
    if (process.env.NODE_ENV === "production") {
      _prisma = new PrismaClient();
    } else {
      if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient();
      }
      _prisma = globalForPrisma.prisma;
    }
  }

  return _prisma;
}

// Export a Proxy that forwards all properties and methods to the lazy-loaded PrismaClient instance
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    const prismaInstance = getPrisma();
    const value = Reflect.get(prismaInstance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(prismaInstance);
    }
    return value;
  },
});

