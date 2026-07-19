import React from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function Header() {
  const user = await currentUser();
  let pendingCount = 0;

  const dbUrl = process.env.DATABASE_URL;
  const isDbConfigured = dbUrl && !dbUrl.includes("api_key=eyJkYX");

  if (isDbConfigured && user) {
    try {
      // Find current user's profile
      const myProfile = await prisma.studyProfile.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (myProfile) {
        // Expiration check: Mark pending requests older than 7 days as expired
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        await prisma.matchRequest.updateMany({
          where: {
            status: "pending",
            createdAt: { lt: sevenDaysAgo },
          },
          data: { status: "expired" },
        });

        // Count pending incoming requests
        pendingCount = await prisma.matchRequest.count({
          where: {
            recipientProfileId: myProfile.id,
            status: "pending",
          },
        });
      }
    } catch (e) {
      console.error("Error checking match requests badge count:", e);
    }
  }

  return (
    <nav className="relative z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/app" className="flex items-center gap-2">
          <span className="text-base sm:text-xl font-extrabold tracking-tight text-white group-hover:text-indigo-400">
            Study Buddy <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent hidden sm:inline">Matcher</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <Link
          href="/app"
          className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          Dashboard
        </Link>
        <Link
          href="/matches"
          className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          Find Buddies
        </Link>
        
        {/* Requests Link with Conditional Badge */}
        <Link
          href="/matches/requests"
          className="relative text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1"
        >
          Requests
          {pendingCount > 0 && (
            <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[8px] sm:text-[10px] font-bold text-white leading-none border border-slate-950">
              {pendingCount}
            </span>
          )}
        </Link>

        <Link
          href="/app/settings"
          className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          Settings
        </Link>

        {user && <UserButton appearance={{ elements: { userButtonAvatarBox: "h-6 w-6 sm:h-8 sm:w-8" } }} />}
      </div>
    </nav>
  );
}
