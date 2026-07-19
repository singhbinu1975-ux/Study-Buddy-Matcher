"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function sendMatchRequest(recipientProfileId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // 1. Fetch current user's profile
  const requesterProfile = await prisma.studyProfile.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!requesterProfile) {
    throw new Error("Please complete onboarding first.");
  }

  if (requesterProfile.id === recipientProfileId) {
    throw new Error("You cannot send a match request to yourself.");
  }

  // 1.5 Rate Limiting: Max 10 requests per 24 hours
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const requestsSentIn24h = await prisma.matchRequest.count({
    where: {
      requesterProfileId: requesterProfile.id,
      createdAt: { gte: oneDayAgo }
    }
  });

  if (requestsSentIn24h >= 10) {
    return { success: false, error: "Match request limit reached. You can only send up to 10 requests per day." };
  }

  // 2. Check for existing active requests (pending or accepted)
  const existing = await prisma.matchRequest.findFirst({
    where: {
      OR: [
        {
          requesterProfileId: requesterProfile.id,
          recipientProfileId: recipientProfileId,
        },
        {
          requesterProfileId: recipientProfileId,
          recipientProfileId: requesterProfile.id,
        },
      ],
      status: { in: ["pending", "accepted"] },
    },
  });

  if (existing) {
    return { success: false, error: "An active match or pending request already exists." };
  }

  // 3. Create request
  await prisma.matchRequest.create({
    data: {
      requesterProfileId: requesterProfile.id,
      recipientProfileId: recipientProfileId,
      status: "pending",
    },
  });

  revalidatePath("/matches");
  revalidatePath(`/matches/${recipientProfileId}`);
  return { success: true };
}

export async function respondToMatchRequest(requestId: string, status: "accepted" | "declined") {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // 1. Fetch the request to confirm authorization
  const request = await prisma.matchRequest.findUnique({
    where: { id: requestId },
    include: {
      recipientProfile: true,
    },
  });

  if (!request) {
    throw new Error("Match request not found.");
  }

  if (request.recipientProfile.userId !== user.id) {
    throw new Error("Unauthorized. You are not the recipient of this request.");
  }

  // 2. Update status
  await prisma.matchRequest.update({
    where: { id: requestId },
    data: { status },
  });

  revalidatePath("/matches/requests");
  revalidatePath("/app");
  return { success: true };
}
