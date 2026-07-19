import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import CreatePodForm from "./CreatePodForm";

export const dynamic = "force-dynamic";

export default async function CreatePodPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // 1. Fetch creator's study profile
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      profiles: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const activeProfile = dbUser?.profiles?.[0];

  let buddies: any[] = [];
  let dbError = null;

  if (!activeProfile) {
    redirect("/onboarding");
  }

  try {
    // 2. Fetch blocked users to exclude
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

    // 3. Fetch accepted 1-on-1 matches
    const activeMatches = await prisma.matchRequest.findMany({
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

    // 4. Map matches to buddies details
    buddies = activeMatches.map((match) => {
      const partnerProfile = match.requesterProfileId === activeProfile.id
        ? match.recipientProfile
        : match.requesterProfile;
      return {
        id: partnerProfile.id,
        name: partnerProfile.user.name,
        school: partnerProfile.user.school,
        subject: partnerProfile.subject,
      };
    });
  } catch (e: any) {
    console.error("Prisma error in CreatePodPage:", e);
    dbError = e?.message || "Failed to query matches database.";
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

      {/* Shared Navigation Header */}
      <Header />

      <main className="relative z-10 flex-1 max-w-xl w-full mx-auto px-6 py-12 flex flex-col justify-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-white">Create a Study Pod</h2>
          <p className="text-slate-400 text-sm">
            Create a group study pod. Invite members from your existing accepted matches to study together.
          </p>
        </div>

        {dbError ? (
          <div className="p-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-300">
            <h3 className="font-bold text-white text-sm">Database Error</h3>
            <p className="text-xs mt-1">{dbError}</p>
          </div>
        ) : (
          <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl">
            <CreatePodForm matches={buddies} />
          </div>
        )}
      </main>
    </div>
  );
}
