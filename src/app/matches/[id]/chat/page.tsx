import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import ChatBox from "./ChatBox";
import Link from "next/link";
import SafetyActions from "@/components/SafetyActions";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id: partnerProfileId } = await params;
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  let myProfile: any = null;
  let matchRequest: any = null;
  let messages: any[] = [];
  let activeSession: any = null;
  let isBlocked = false;
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
      });

      if (myProfile) {
        // 2. Fetch match request
        matchRequest = await prisma.matchRequest.findFirst({
          where: {
            status: "accepted",
            OR: [
              { requesterProfileId: myProfile.id, recipientProfileId: partnerProfileId },
              { requesterProfileId: partnerProfileId, recipientProfileId: myProfile.id },
            ],
          },
          include: {
            requesterProfile: {
              include: {
                user: {
                  select: { name: true, school: true },
                },
              },
            },
            recipientProfile: {
              include: {
                user: {
                  select: { name: true, school: true },
                },
              },
            },
          },
        });

        // 3. Fetch messages and active session if match exists
        if (matchRequest) {
          messages = await prisma.message.findMany({
            where: { matchId: matchRequest.id },
            orderBy: { createdAt: "asc" },
          });

          if ("session" in prisma) {
            activeSession = await (prisma as any).session.findFirst({
              where: {
                matchId: matchRequest.id,
                status: { in: ["proposed", "confirmed"] },
              },
            });
          }

          // Check blocks
          const partnerUserId = matchRequest.requesterProfileId === myProfile.id
            ? matchRequest.recipientProfile.user.userId
            : matchRequest.requesterProfile.user.userId;

          if ("block" in prisma) {
            const block = await (prisma as any).block.findFirst({
              where: {
                OR: [
                  { blockerId: user.id, blockedId: partnerUserId },
                  { blockerId: partnerUserId, blockedId: user.id },
                ],
              },
            });
            if (block) {
              isBlocked = true;
            }
          }
        }
      }
    } catch (e: any) {
      console.error("Prisma error in Chat Page:", e);
      dbError = e?.message || "Failed to reach the database server.";
    }
  }

  // Security Access Check
  if (!dbError && (!myProfile || !matchRequest || isBlocked)) {
    redirect("/app");
  }

  // Determine partner profile details
  const partnerProfile = matchRequest?.requesterProfileId === myProfile?.id
    ? matchRequest?.recipientProfile
    : matchRequest?.requesterProfile;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

      {/* Shared Header Navigation */}
      <Header />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col justify-start space-y-6">
        
        {/* Database Error Banner */}
        {dbError && (
          <div className="p-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-300 space-y-3">
            <h3 className="font-bold text-lg text-white">Database Connection Issue</h3>
            <p className="text-sm">
              Chat cannot be loaded because the database is offline or unconfigured.
            </p>
          </div>
        )}

        {/* Live Chat Panel */}
        {!dbError && matchRequest && partnerProfile && (
          <div className="flex-1 min-h-[500px] max-h-[700px] flex flex-col rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Chat Partner Header bar */}
            <div className="p-4 bg-slate-900/60 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Active Study Match Chat</span>
                <h3 className="text-lg font-bold text-white leading-tight mt-0.5">{partnerProfile.user.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{partnerProfile.user.school} | Subject: {partnerProfile.subject}</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <SafetyActions targetUserId={partnerProfile.userId} targetName={partnerProfile.user.name} />
                <Link
                  href="/app"
                  className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-colors"
                >
                  Exit Chat
                </Link>
              </div>
            </div>

            {/* Chat Box Element */}
            <ChatBox
              matchId={matchRequest.id}
              currentUserId={user.id}
              initialMessages={messages.map((m) => ({
                id: m.id,
                matchId: m.matchId,
                senderId: m.senderId,
                content: m.content,
                createdAt: m.createdAt.toISOString(),
              }))}
              partnerName={partnerProfile.user.name}
              initialSession={activeSession ? {
                id: activeSession.id,
                matchId: activeSession.matchId,
                proposerId: activeSession.proposerId,
                scheduledTime: activeSession.scheduledTime.toISOString(),
                status: activeSession.status,
              } : null}
            />
          </div>
        )}
      </main>
    </div>
  );
}
