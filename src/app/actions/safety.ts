"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function reportUser(reportedUserId: string, reason: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  if (!reason || !reason.trim()) {
    throw new Error("Please specify a reason for the report.");
  }

  // Save report
  await prisma.report.create({
    data: {
      reporterId: user.id,
      reportedUserId,
      reason: reason.trim(),
    },
  });

  return { success: true };
}

export async function blockUser(blockedUserId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  if (user.id === blockedUserId) {
    throw new Error("You cannot block yourself.");
  }

  // 1. Create the block relation in PostgreSQL
  try {
    await prisma.block.create({
      data: {
        blockerId: user.id,
        blockedId: blockedUserId,
      },
    });
  } catch (err) {
    console.error("Block relation already exists:", err);
    // Continue since they are blocked anyway
  }

  // 2. Query profiles to delete any pending/active matches & messages & sessions
  const myProfile = await prisma.studyProfile.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const blockedProfile = await prisma.studyProfile.findFirst({
    where: { userId: blockedUserId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (myProfile && blockedProfile) {
    // Delete match request rows between blocker and blocked (cascades deletion of messages & sessions)
    await prisma.matchRequest.deleteMany({
      where: {
        OR: [
          {
            requesterProfileId: myProfile.id,
            recipientProfileId: blockedProfile.id,
          },
          {
            requesterProfileId: blockedProfile.id,
            recipientProfileId: myProfile.id,
          },
        ],
      },
    });
  }

  revalidatePath("/app");
  revalidatePath("/matches");
  return { success: true };
}
