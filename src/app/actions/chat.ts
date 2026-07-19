"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import Pusher from "pusher";

export async function sendMessage(matchId: string, content: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  if (!content || !content.trim()) {
    throw new Error("Message content cannot be empty.");
  }

  // 1. Verify match exists and is accepted, and that user is one of the participants
  const match = await prisma.matchRequest.findUnique({
    where: { id: matchId },
    include: {
      requesterProfile: true,
      recipientProfile: true,
    },
  });

  if (!match || match.status !== "accepted") {
    throw new Error("Unauthorized. Chat is only allowed for active accepted matches.");
  }

  if (match.requesterProfile.userId !== user.id && match.recipientProfile.userId !== user.id) {
    throw new Error("Unauthorized. You are not a participant in this match.");
  }

  // 2. Save message to database
  const message = await prisma.message.create({
    data: {
      matchId,
      senderId: user.id,
      content: content.trim(),
    },
  });

  // 3. Trigger Pusher Real-Time Notification
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (appId && key && secret && cluster) {
    try {
      const pusher = new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
      });

      await pusher.trigger(`match-${matchId}`, "message", {
        id: message.id,
        matchId: message.matchId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        senderName: user.fullName || user.firstName || "Student",
      });
    } catch (e) {
      console.error("Error triggering Pusher event:", e);
    }
  } else {
    console.warn("Pusher environment credentials missing. Message saved to database but real-time push event skipped.");
  }

  return {
    success: true,
    message: {
      id: message.id,
      matchId: message.matchId,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      senderName: user.fullName || user.firstName || "Student",
    },
  };
}
