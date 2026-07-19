import React from "react";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AvailabilityBlock } from "@/app/actions/profile";
import Header from "@/components/Header";
import FeedbackPrompt from "./FeedbackPrompt";

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

export default async function AppDashboardPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch the Postgres user, their profiles, accepted matches, upcoming sessions, and feedback prompts
  let dbUser = null;
  let activeProfile = null;
  let activeMatches: any[] = [];
  let upcomingSessions: any[] = [];
  let feedbackRequiredSession: any = null;
  let dbError = null;

  const dbUrl = process.env.DATABASE_URL;
  const isDbConfigured = dbUrl && !dbUrl.includes("api_key=eyJkYX");

  if (!isDbConfigured) {
    dbError = "DATABASE_URL is not configured. Please set up a real PostgreSQL database on Supabase or Railway, update your .env file, and run 'npx prisma db push' as explained in DEPLOYMENT.md.";
  } else {
    try {
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

      // Fetch active accepted matches
      if (activeProfile) {
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

        activeMatches = await prisma.matchRequest.findMany({
          where: {
            status: "accepted",
            OR: [
              { requesterProfileId: activeProfile.id },
              { recipientProfileId: activeProfile.id },
            ],
            requesterProfile: {
              userId: {
                notIn: blockedUserIds,
              },
            },
            recipientProfile: {
              userId: {
                notIn: blockedUserIds,
              },
            },
          },
          include: {
            requesterProfile: {
              include: {
                user: {
                  select: { name: true, school: true, email: true },
                },
              },
            },
            recipientProfile: {
              include: {
                user: {
                  select: { name: true, school: true, email: true },
                },
              },
            },
          },
        });

        // Fetch upcoming confirmed sessions for those matches
        if ("session" in prisma) {
          upcomingSessions = await (prisma as any).session.findMany({
            where: {
              status: "confirmed",
              matchId: {
                in: activeMatches.map((m) => m.id),
              },
            },
            include: {
              match: {
                include: {
                  requesterProfile: {
                    include: {
                      user: { select: { name: true } },
                    },
                  },
                  recipientProfile: {
                    include: {
                      user: { select: { name: true } },
                    },
                  },
                },
              },
            },
            orderBy: {
              scheduledTime: "asc",
            },
          });

          // Fetch past confirmed sessions requiring feedback (if feedback is compiled in Prisma client)
          if ("feedback" in prisma) {
            feedbackRequiredSession = await (prisma as any).session.findFirst({
              where: {
                status: "confirmed",
                scheduledTime: { lt: new Date() },
                match: {
                  OR: [
                    { requesterProfileId: activeProfile.id },
                    { recipientProfileId: activeProfile.id },
                  ],
                  requesterProfile: {
                    userId: {
                      notIn: blockedUserIds,
                    },
                  },
                  recipientProfile: {
                    userId: {
                      notIn: blockedUserIds,
                    },
                  },
                },
                feedbacks: {
                  none: {
                    userId: user.id,
                  },
                },
              },
              include: {
                match: {
                  include: {
                    requesterProfile: {
                      include: {
                        user: { select: { name: true } },
                      },
                    },
                    recipientProfile: {
                      include: {
                        user: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            });
          }
        }
      }
    } catch (e: any) {
      console.error("Prisma Database Query Error:", e);
      dbError = e?.message || "Failed to reach the database server.";
    }
  }

  // If there's no DB error, but they haven't completed onboarding, send them there
  if (!dbError && (!dbUser || !activeProfile)) {
    redirect("/onboarding");
  }

  // Parse availability JSON safely
  let availabilityList: AvailabilityBlock[] = [];
  try {
    if (activeProfile?.availability) {
      const parsed = typeof activeProfile.availability === "string" 
        ? JSON.parse(activeProfile.availability) 
        : activeProfile.availability;
      if (Array.isArray(parsed)) {
        availabilityList = parsed as AvailabilityBlock[];
      }
    }
  } catch (e) {
    console.error("Error parsing availability JSON:", e);
  }

  const activeProfileId = activeProfile?.id || "";

  // Map matches to partners
  const buddies = activeMatches.map((match) => {
    const partnerProfile = match.requesterProfileId === activeProfileId 
      ? match.recipientProfile 
      : match.requesterProfile;
    return {
      id: partnerProfile.id,
      name: partnerProfile.user.name,
      school: partnerProfile.user.school,
      email: partnerProfile.user.email,
      subject: partnerProfile.subject,
      goal: partnerProfile.goal,
    };
  });

  // Map upcoming sessions to formatted cards
  const formattedSessions = upcomingSessions.map((sess) => {
    const partnerProfile = sess.match.requesterProfileId === activeProfileId
      ? sess.match.recipientProfile
      : sess.match.requesterProfile;
    return {
      id: sess.id,
      partnerName: partnerProfile.user.name,
      scheduledTime: sess.scheduledTime.toISOString(),
      subject: partnerProfile.subject,
    };
  });

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

      {/* Shared Navigation Header */}
      <Header />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col justify-center space-y-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-white">
              Welcome back, {user.firstName || "Student"}
            </h2>
            <p className="text-slate-400 text-sm max-w-xl">
              Here is your study profile summary. Find partners who share your subjects and schedule slots.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 self-start">
            <Link
              href="/app/profile"
              className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-all"
            >
              Edit Study Profile
            </Link>
            {!dbError && (
              <Link
                href="/matches"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-900/20"
              >
                Find Study Buddies
              </Link>
            )}
          </div>
        </div>

        {/* Database Connection Error Banner */}
        {dbError && (
          <div className="p-6 sm:p-8 rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-300 space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-white">Database Connection Issue</h3>
              <p className="text-sm">
                The application could not reach or query your PostgreSQL database. This is usually due to:
              </p>
            </div>
            <ul className="list-disc list-inside text-xs text-rose-400 space-y-1">
              <li>Your database credentials or connection string inside <code className="bg-slate-900 px-1 py-0.5 rounded text-rose-200">.env</code> (key: <code className="bg-slate-900 px-1 py-0.5 rounded text-rose-200">DATABASE_URL</code>) is not yet set or incorrect.</li>
              <li>Your remote database instance (e.g. Supabase, Railway) is offline or can't be reached.</li>
              <li>The required database tables are missing. You may need to run <code className="bg-slate-900 px-1.5 py-0.5 rounded text-white">npx prisma db push</code>.</li>
            </ul>
            <p className="text-xs pt-2 border-t border-rose-500/10">
              Error details: <code className="bg-slate-900 px-2 py-1 rounded text-rose-100">{dbError}</code>
            </p>
          </div>
        )}

        {/* Current Active Profile Widget */}
        {!dbError && activeProfile && dbUser && (
          <div className="p-6 sm:p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">My Matching Profile</span>
              <span className="text-xs text-slate-500">{dbUser.school}</span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Subject / Exam</p>
                <p className="text-lg font-bold text-white mt-1">{activeProfile.subject}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Study Goal</p>
                <p className="text-sm font-medium text-slate-200 mt-1">{GOAL_LABELS[activeProfile.goal] || activeProfile.goal}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Format Preference</p>
                <p className="text-sm font-medium text-slate-200 mt-1">{FORMAT_LABELS[activeProfile.format] || activeProfile.format}</p>
              </div>
              {activeProfile.location && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Location</p>
                  <p className="text-sm font-medium text-slate-200 mt-1">{activeProfile.location}</p>
                </div>
              )}
            </div>

            {/* Availability Display */}
            <div className="space-y-2 border-t border-white/5 pt-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Weekly Availability Schedule</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {availabilityList.map((block, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 rounded-lg border border-white/5 bg-slate-900 text-xs text-slate-300"
                  >
                    <span className="font-semibold text-indigo-400">{block.day}</span>: {block.startTime} - {block.endTime}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid gap-6 md:grid-cols-3 font-sans">
          
          {/* Card 1: Matches List */}
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4 md:col-span-3 text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm">
                  ✓
                </div>
                <h3 className="font-bold text-white text-lg">My Active Matches</h3>
              </div>
              {!dbError && (
                <span className="text-xs text-slate-500 font-medium">
                  {buddies.length} Buddy{buddies.length !== 1 ? "ies" : ""} Connected
                </span>
              )}
            </div>

            {buddies.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {buddies.map((buddy) => (
                  <div
                    key={buddy.id}
                    className="p-4 rounded-xl border border-white/5 bg-slate-900/50 space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-white text-sm">{buddy.name}</h4>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[9px] font-bold uppercase tracking-wider">
                        {buddy.subject}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[10px]">{buddy.school}</p>
                    <p className="text-indigo-400 text-[10px] select-all cursor-copy font-mono break-all bg-slate-950 p-1.5 rounded mt-1.5 border border-white/5">
                      ✉ {buddy.email}
                    </p>
                    <div className="pt-2">
                      <Link
                        href={`/matches/${buddy.id}/chat`}
                        className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold text-center block transition-colors"
                      >
                        💬 Open Chat Room
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-slate-400">You haven't matched with anyone yet.</p>
                <Link
                  href="/matches"
                  className="inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
                >
                  Find Study Buddies
                </Link>
              </div>
            )}
          </div>

          {/* Card 2: Chats Placeholder */}
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-3 text-left">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 font-bold">
              💬
            </div>
            <h3 className="font-semibold text-white">Direct Chats</h3>
            <p className="text-xs text-slate-400">Direct real-time study chat channels are open inside each match room.</p>
          </div>

          {/* Card 3: Upcoming Sessions */}
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4 md:col-span-2 text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  📅
                </div>
                <h3 className="font-bold text-white text-base">Upcoming Sessions</h3>
              </div>
              {!dbError && (
                <span className="text-xs text-slate-500 font-medium">
                  {formattedSessions.length} Confirmed
                </span>
              )}
            </div>

            {formattedSessions.length > 0 ? (
              <div className="space-y-3">
                {formattedSessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <p className="font-bold text-white text-sm">Study session with {sess.partnerName}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Subject: {sess.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-400">
                        {new Date(sess.scheduledTime).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(sess.scheduledTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-slate-400">No upcoming study sessions scheduled.</p>
                <p className="text-[10px] text-slate-500">Propose a date and time inside the buddy chat room.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Feedback modal prompt overlay */}
      {!dbError && feedbackRequiredSession && (
        <FeedbackPrompt
          sessionId={feedbackRequiredSession.id}
          partnerName={
            feedbackRequiredSession.match.requesterProfileId === activeProfileId
              ? feedbackRequiredSession.match.recipientProfile.user.name
              : feedbackRequiredSession.match.requesterProfile.user.name
          }
          subject={
            feedbackRequiredSession.match.requesterProfileId === activeProfileId
              ? feedbackRequiredSession.match.recipientProfile.subject
              : feedbackRequiredSession.match.requesterProfile.subject
          }
        />
      )}
    </div>
  );
}
