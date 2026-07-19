import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Prisma query engine binaries are included in Vercel's file tracing
  outputFileTracingIncludes: {
    "/app/**": ["./node_modules/.prisma/client/**/*"],
    "/matches/**": ["./node_modules/.prisma/client/**/*"],
    "/onboarding/**": ["./node_modules/.prisma/client/**/*"],
    "/pods/**": ["./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;
