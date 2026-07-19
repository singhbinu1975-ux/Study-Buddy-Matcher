import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { AvailabilityBlock } from "@/app/actions/profile";
import { sendMatchRequest } from "@/app/actions/match";
import Header from "@/components/Header";
import Link from "next/link";
import SafetyActions from "@/components/SafetyActions";

const GOAL_LABELS: Record<string, string> = {
  exam_prep: "Exam Preparation",
  homework_help: "Homework Help",
  general_practice: "General Practice",
  language_exchange: "Language Exchange",
};

const FORMAT_LABELS: Record<string, string> = {
  video: "Remote Video",
  in_person: "In-Person",
  either: "Either Format",
};

interface MatchDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  let partnerProfile: any = null;
  let myProfile: any = null;
  let existingRequest: any = null;
  let dbError: string | null = null;

  const dbUrl = process.env.DATABASE_URL;
  const isDbConfigured = dbUrl && !dbUrl.includes("api_key=eyJkYX");

  if (!isDbConfigured) {
    dbError = "DATABASE_URL is not configured. Please set up a real PostgreSQL database on Supabase or Railway, update your .env file, and run 'npx prisma db push' as explained in DEPLOYMENT.md.";
  } else {
    try {
      // 1. Fetch partner profile
      partnerProfile = await prisma.studyProfile.findUnique({
        where: { id: id },
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

      // Check blocks
      if (partnerProfile) {
        let isBlocked = false;
        if ("block" in prisma) {
          const block = await (prisma as any).block.findFirst({
            where: {
              OR: [
                { blockerId: user.id, blockedId: partnerProfile.userId },
                { blockerId: partnerProfile.userId, blockedId: user.id },
              ],
            },
          });
          if (block) {
            isBlocked = true;
          }
        }
        if (isBlocked) {
          partnerProfile = null;
        }
      }

      // 2. Fetch my profile
      myProfile = await prisma.studyProfile.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      // 3. Fetch any existing request between us
      if (myProfile && partnerProfile) {
        existingRequest = await prisma.matchRequest.findFirst({
          where: {
            OR: [
              {
                requesterProfileId: myProfile.id,
                recipientProfileId: partnerProfile.id,
              },
              {
                requesterProfileId: partnerProfile.id,
                recipientProfileId: myProfile.id,
              },
            ],
            status: { in: ["pending", "accepted"] },
          },
        });
      }
    } catch (e: any) {
      console.error("Prisma error fetching partner details:", e);
      dbError = e?.message || "Failed to reach the database server.";
    }
  }

  // Parse availability JSON safely
  let availabilityList: AvailabilityBlock[] = [];
  if (partnerProfile) {
    try {
      if (partnerProfile.availability) {
        const parsed = typeof partnerProfile.availability === "string" 
          ? JSON.parse(partnerProfile.availability) 
          : partnerProfile.availability;
        if (Array.isArray(parsed)) {
          availabilityList = parsed as AvailabilityBlock[];
        }
      }
    } catch (e) {
      console.error("Error parsing availability JSON:", e);
    }
  }

  // Server Action inline wrapper for request submission
  async function handleSendRequest() {
    "use server";
    if (partnerProfile) {
      await sendMatchRequest(partnerProfile.id);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

      {/* Shared Navigation Header */}
      <Header />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-2xl w-full mx-auto px-6 py-12 flex flex-col justify-center space-y-6">
        
        {/* Navigation back */}
        <div className="text-left">
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider"
          >
            ← Back to Matches
          </Link>
        </div>

        {/* Database Error Banner */}
        {dbError && (
          <div className="p-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-300 space-y-3">
            <h3 className="font-bold text-lg text-white">Database Connection Issue</h3>
            <p className="text-sm">
              Cannot fetch partner details because the database is unconfigured.
            </p>
          </div>
        )}

        {/* Profile Card */}
        {!dbError && partnerProfile ? (
          <div className="p-8 sm:p-10 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl space-y-8">
            {/* Header info */}
            <div className="border-b border-white/5 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  Partner Profile
                </span>
                <h2 className="text-3xl font-extrabold text-white pt-2">
                  {partnerProfile.user.name}
                </h2>
                <p className="text-slate-400 text-sm">{partnerProfile.user.school}</p>
              </div>
              <SafetyActions targetUserId={partnerProfile.userId} targetName={partnerProfile.user.name} />
            </div>

            {/* Profile Grid Details */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">Subject Interest</span>
                <span className="text-lg font-bold text-white">{partnerProfile.subject}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">Study Goal</span>
                <span className="text-sm font-medium text-slate-200">{GOAL_LABELS[partnerProfile.goal] || partnerProfile.goal}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">Format Preference</span>
                <span className="text-sm font-medium text-slate-200">{FORMAT_LABELS[partnerProfile.format] || partnerProfile.format}</span>
              </div>
              {partnerProfile.location && (
                <div className="space-y-1">
                  <span className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">Campus Location</span>
                  <span className="text-sm font-medium text-slate-200">📍 {partnerProfile.location}</span>
                </div>
              )}
            </div>

            {/* Weekly Availability Schedule */}
            <div className="space-y-3 border-t border-white/5 pt-6 text-left">
              <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider">Weekly Schedule Availability</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {availabilityList.map((block, idx) => (
                  <div
                    key={idx}
                    className="px-3.5 py-2 rounded-xl border border-white/5 bg-slate-900/60 text-xs text-slate-200"
                  >
                    <span className="font-semibold text-indigo-400">{block.day}</span>: {block.startTime} - {block.endTime}
                  </div>
                ))}
              </div>
            </div>

            {/* Match CTA Button Panel */}
            <div className="pt-6 border-t border-white/5 flex flex-col items-center">
              {!existingRequest ? (
                <form action={handleSendRequest} className="w-full">
                  <button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg shadow-indigo-900/20 text-center"
                  >
                    Send Study Match Request
                  </button>
                </form>
              ) : existingRequest.status === "pending" ? (
                existingRequest.requesterProfileId === myProfile?.id ? (
                  <button
                    type="button"
                    disabled
                    className="w-full h-12 rounded-xl bg-slate-800 border border-white/5 text-slate-400 font-semibold cursor-not-allowed text-center"
                  >
                    Match Request Pending
                  </button>
                ) : (
                  <Link
                    href="/matches/requests"
                    className="w-full h-12 flex items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-all text-center shadow-lg shadow-amber-900/20"
                  >
                    Respond to Match Request (Action Required)
                  </Link>
                )
              ) : (
                <div className="w-full space-y-3">
                  <button
                    type="button"
                    disabled
                    className="w-full h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold cursor-not-allowed text-center"
                  >
                    ✓ Already Matched (Active Bud)
                  </button>
                  <Link
                    href={`/matches/${partnerProfile.id}/chat`}
                    className="w-full h-12 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all text-center shadow-lg shadow-indigo-900/20"
                  >
                    💬 Open Chat Room
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          !dbError && (
            <div className="p-12 text-center rounded-3xl border border-white/5 bg-white/[0.01]">
              <p className="text-slate-400 font-semibold">Study partner profile not found.</p>
              <Link href="/matches" className="text-indigo-400 hover:underline text-xs mt-2 block">
                Return to Matches List
              </Link>
            </div>
          )
        )}
      </main>
    </div>
  );
}
