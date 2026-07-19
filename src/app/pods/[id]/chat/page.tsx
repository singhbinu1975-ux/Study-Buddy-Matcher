import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import PodChatBox from "./PodChatBox";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PodChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function PodChatPage({ params }: PodChatPageProps) {
  const { id: podId } = await params;
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  let pod: any = null;
  let messages: any[] = [];
  let activeSession: any = null;
  let isMember = false;
  let dbError: string | null = null;

  try {
    // 1. Fetch Pod, members, and active sessions
    pod = await prisma.pod.findUnique({
      where: { id: podId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
        sessions: {
          where: {
            status: { in: ["proposed", "confirmed"] },
          },
          include: {
            confirmations: {
              select: { userId: true },
            },
          },
          take: 1,
        },
      },
    });

    if (pod) {
      isMember = pod.members.some((m: any) => m.userId === user.id);
      messages = pod.messages;
      activeSession = pod.sessions?.[0] || null;
    }
  } catch (e: any) {
    console.error("Prisma error in PodChatPage:", e);
    dbError = e?.message || "Failed to reach the database server.";
  }

  // Security Access Check
  if (!dbError && (!pod || !isMember)) {
    redirect("/app");
  }

  // Map messages to include sender names from current members
  const memberMap: Record<string, string> = {};
  pod?.members.forEach((m: any) => {
    memberMap[m.userId] = m.user.name;
  });

  const formattedMessages = messages.map((m) => ({
    id: m.id,
    podId: m.podId,
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    senderName: memberMap[m.senderId] || "Student",
  }));

  const formattedSession = activeSession ? {
    id: activeSession.id,
    podId: activeSession.podId,
    proposerId: activeSession.proposerId,
    scheduledTime: activeSession.scheduledTime.toISOString(),
    status: activeSession.status,
    confirmations: activeSession.confirmations.map((c: any) => c.userId),
    totalMembers: pod.members.length,
  } : null;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

      {/* Shared Header Navigation */}
      <Header />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-6 py-8 flex flex-col md:flex-row gap-6 justify-start">
        
        {/* Live Chat Panel */}
        {!dbError && pod && (
          <>
            <div className="flex-1 min-h-[500px] max-h-[700px] flex flex-col rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl overflow-hidden">
              {/* Chat Header bar */}
              <div className="p-4 bg-slate-900/60 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Active Study Pod Chat</span>
                  <h3 className="text-lg font-bold text-white leading-tight mt-0.5">{pod.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">Subject: {pod.subject} • {pod.members.length} Members</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <Link
                    href="/app"
                    className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-colors"
                  >
                    Exit Chat
                  </Link>
                </div>
              </div>

              {/* Chat Box Element */}
              <PodChatBox
                podId={pod.id}
                currentUserId={user.id}
                initialMessages={formattedMessages}
                podName={pod.name}
                initialSession={formattedSession}
                membersMap={memberMap}
              />
            </div>

            {/* Sidebar with Member List */}
            <div className="w-full md:w-64 p-6 rounded-3xl border border-white/5 bg-white/[0.01] flex flex-col gap-4 self-start text-left">
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 border-b border-white/5 pb-2">
                Pod Members ({pod.members.length})
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pod.members.map((m: any) => (
                  <div key={m.userId} className="text-xs">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      {m.user.name}
                      {m.userId === pod.createdBy && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 text-[8px] font-bold uppercase tracking-wider">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{m.user.email}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Database Error Banner */}
        {dbError && (
          <div className="p-6 w-full rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-300 space-y-3">
            <h3 className="font-bold text-lg text-white">Database Connection Issue</h3>
            <p className="text-sm">
              Pod chat cannot be loaded because the database is offline or unconfigured.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
