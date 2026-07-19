import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import MatchesLayout from "./MatchesLayout";
import Header from "@/components/Header";
import Link from "next/link";

export default async function MatchesPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch current user and their active profile, and all other profiles
  let dbUser = null;
  let activeProfile = null;
  let allProfiles: any[] = [];
  let dbError = null;

  const dbUrl = process.env.DATABASE_URL;
  const isDbConfigured = dbUrl && !dbUrl.includes("api_key=eyJkYX");

  if (!isDbConfigured) {
    dbError = "DATABASE_URL is not configured. Please set up a real PostgreSQL database on Supabase or Railway, update your .env file, and run 'npx prisma db push' as explained in DEPLOYMENT.md.";
  } else {
    try {
      // 1. Fetch current user profile
      dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          profiles: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
      activeProfile = dbUser?.profiles?.[0];

      // 2. Fetch blocked users
      let blockedUserIds: string[] = [];
      if ("block" in prisma) {
        const blocks = await (prisma as any).block.findMany({
          where: {
            OR: [
              { blockerId: user.id },
              { blockedId: user.id },
            ],
          },
          select: {
            blockerId: true,
            blockedId: true,
          },
        });
        blockedUserIds = blocks.map((b: any) => b.blockerId === user.id ? b.blockedId : b.blockerId);
      }

      // 3. Fetch all other users' profiles (excluding blocked users)
      if (dbUser && activeProfile) {
        allProfiles = await prisma.studyProfile.findMany({
          where: {
            NOT: {
              userId: {
                in: [user.id, ...blockedUserIds],
              },
            },
          },
          include: {
            user: {
              select: {
                name: true,
                school: true,
                email: true,
              },
            },
          },
        });
      }
    } catch (e: any) {
      console.error("Prisma query error on matches page:", e);
      dbError = e?.message || "Failed to reach the database server.";
    }
  }

  // Redirect to onboarding if they haven't completed onboarding yet (and database is active)
  if (!dbError && (!dbUser || !activeProfile)) {
    redirect("/onboarding");
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

      {/* Shared Navigation Header */}
      <Header />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col justify-start space-y-6">
        <div className="space-y-2 text-left">
          <h2 className="text-3xl font-extrabold text-white">
            Find Your Study Partner
          </h2>
          <p className="text-slate-400 text-sm max-w-xl">
            Browse other students matching your subject preferences. Results are ranked automatically by subject relevance, availability overlaps, format, and campus location.
          </p>
        </div>

        {/* Database Error Banner */}
        {dbError && (
          <div className="p-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-300 space-y-3">
            <h3 className="font-bold text-lg text-white">Database Connection Issue</h3>
            <p className="text-sm">
              Matches cannot be retrieved because the database is offline or unconfigured.
            </p>
            <p className="text-xs">
              Please check your <code className="bg-slate-900 px-1 py-0.5 rounded text-rose-200">DATABASE_URL</code> in <code className="bg-slate-900 px-1 py-0.5 rounded text-rose-200">.env</code>.
            </p>
          </div>
        )}

        {/* Client Layout with Interactive Search and Sorting */}
        {!dbError && activeProfile && dbUser && (
          <MatchesLayout
            myProfile={activeProfile}
            mySchool={dbUser.school}
            allProfiles={allProfiles}
          />
        )}
      </main>
    </div>
  );
}
