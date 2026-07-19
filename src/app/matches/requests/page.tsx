import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { respondToMatchRequest } from "@/app/actions/match";
import Header from "@/components/Header";
import Link from "next/link";

const GOAL_LABELS: Record<string, string> = {
  exam_prep: "Exam Prep",
  homework_help: "Homework Help",
  general_practice: "General Practice",
  language_exchange: "Language Exchange",
};

const FORMAT_LABELS: Record<string, string> = {
  video: "Remote Video",
  in_person: "In-Person",
  either: "Either Format",
};

export default async function MatchRequestsPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  let myProfile: any = null;
  let incomingRequests: any[] = [];
  let dbError: string | null = null;

  const dbUrl = process.env.DATABASE_URL;
  const isDbConfigured = dbUrl && !dbUrl.includes("api_key=eyJkYX");

  if (!isDbConfigured) {
    dbError = "DATABASE_URL is not configured. Please set up a real PostgreSQL database on Supabase or Railway, update your .env file, and run 'npx prisma db push' as explained in DEPLOYMENT.md.";
  } else {
    try {
      // 1. Fetch current user's profile
      myProfile = await prisma.studyProfile.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (myProfile) {
        // Run dynamic expiration check (already runs in Header too, but double check here)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        await prisma.matchRequest.updateMany({
          where: {
            status: "pending",
            createdAt: { lt: sevenDaysAgo },
          },
          data: { status: "expired" },
        });

        // Fetch blocked users
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

        // 2. Fetch pending received requests (excluding blocked users)
        incomingRequests = await prisma.matchRequest.findMany({
          where: {
            recipientProfileId: myProfile.id,
            status: "pending",
            requesterProfile: {
              userId: {
                notIn: blockedUserIds,
              },
            },
          },
          include: {
            requesterProfile: {
              include: {
                user: {
                  select: {
                    name: true,
                    school: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });
      }
    } catch (e: any) {
      console.error("Prisma error in Requests Page:", e);
      dbError = e?.message || "Failed to reach the database server.";
    }
  }

  // Redirect to onboarding if they haven't completed onboarding yet (and database is active)
  if (!dbError && !myProfile) {
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
      <main className="relative z-10 flex-1 max-w-3xl w-full mx-auto px-6 py-12 flex flex-col justify-start space-y-6">
        <div className="space-y-2 text-left">
          <h2 className="text-3xl font-extrabold text-white">
            Incoming Match Requests
          </h2>
          <p className="text-slate-400 text-sm max-w-xl">
            Review matching requests sent by other students. Accepting a request creates a shared match where contact details are exchangeable.
          </p>
        </div>

        {/* Database Error Banner */}
        {dbError && (
          <div className="p-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-300 space-y-3">
            <h3 className="font-bold text-lg text-white">Database Connection Issue</h3>
            <p className="text-sm">
              Requests cannot be loaded because the database is offline or unconfigured.
            </p>
          </div>
        )}

        {/* Requests List */}
        {!dbError && (
          <div className="space-y-4 pt-4">
            {incomingRequests.length > 0 ? (
              incomingRequests.map((req) => {
                const partner = req.requesterProfile;
                
                // Server Action inline bindings for buttons
                const acceptAction = async () => {
                  "use server";
                  await respondToMatchRequest(req.id, "accepted");
                };

                const declineAction = async () => {
                  "use server";
                  await respondToMatchRequest(req.id, "declined");
                };

                return (
                  <div
                    key={req.id}
                    className="p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-xl flex flex-col md:flex-row justify-between gap-6"
                  >
                    {/* Partner Details */}
                    <div className="space-y-3 text-left flex-1">
                      <div className="space-y-0.5">
                        <h3 className="text-lg font-bold text-white">{partner.user.name}</h3>
                        <p className="text-xs text-slate-500 font-medium">{partner.user.school}</p>
                      </div>

                      <div className="grid gap-4 grid-cols-2 max-w-sm text-xs border-t border-white/5 pt-2.5">
                        <div>
                          <span className="block text-slate-500 font-bold uppercase tracking-wider text-[9px]">Subject</span>
                          <span className="text-slate-200 font-semibold">{partner.subject}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 font-bold uppercase tracking-wider text-[9px]">Study Goal</span>
                          <span className="text-slate-200 font-semibold">{GOAL_LABELS[partner.goal] || partner.goal}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-400">
                        Format Preference: <strong>{FORMAT_LABELS[partner.format] || partner.format}</strong>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex sm:flex-row md:flex-col justify-end items-stretch md:items-end gap-3 self-center w-full md:w-auto">
                      <form action={acceptAction} className="w-full md:w-32">
                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all text-center shadow-lg shadow-indigo-900/20"
                        >
                          Accept Match
                        </button>
                      </form>
                      <form action={declineAction} className="w-full md:w-32">
                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all text-center"
                        >
                          Decline
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
                <p className="text-slate-400 font-medium">No incoming match requests.</p>
                <p className="text-xs text-slate-500 mt-1">
                  You'll see requests here when other students request to study with you.
                </p>
                <div className="pt-4">
                  <Link
                    href="/matches"
                    className="inline-flex px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 text-slate-200 transition-colors"
                  >
                    Browse Other Partners
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
