"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import Pusher from "pusher";

// Helper to trigger Pusher realtime notifications
async function triggerPusherEvent(matchId: string, eventName: string, data: any) {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (appId && key && secret && cluster) {
    try {
      const pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
      await pusher.trigger(`match-${matchId}`, eventName, data);
    } catch (e) {
      console.error(`Pusher error in triggerPusherEvent [${eventName}]:`, e);
    }
  } else {
    console.warn("Pusher keys are not configured. Real-time session event skipped.");
  }
}

export async function proposeSession(matchId: string, scheduledTimeIso: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // 1. Verify match relationship is accepted and user belongs to it
  const match = await prisma.matchRequest.findUnique({
    where: { id: matchId },
    include: {
      requesterProfile: true,
      recipientProfile: true,
    },
  });

  if (!match || match.status !== "accepted") {
    throw new Error("Unauthorized. Session scheduling is only allowed for accepted matches.");
  }

  if (match.requesterProfile.userId !== user.id && match.recipientProfile.userId !== user.id) {
    throw new Error("Unauthorized. You are not a participant in this match.");
  }

  const scheduledTime = new Date(scheduledTimeIso);

  // 2. Fetch any existing proposed or confirmed session to update, otherwise create new
  const existingSession = await prisma.session.findFirst({
    where: {
      matchId,
      status: { in: ["proposed", "confirmed"] },
    },
  });

  let session;
  if (existingSession) {
    session = await prisma.session.update({
      where: { id: existingSession.id },
      data: {
        scheduledTime,
        proposerId: user.id,
        status: "proposed",
      },
    });
  } else {
    session = await prisma.session.create({
      data: {
        matchId,
        scheduledTime,
        proposerId: user.id,
        status: "proposed",
      },
    });
  }

  // 3. Dispatch realtime event
  await triggerPusherEvent(matchId, "session-updated", {
    id: session.id,
    matchId: session.matchId,
    proposerId: session.proposerId,
    scheduledTime: session.scheduledTime.toISOString(),
    status: session.status,
  });

  return { success: true, session };
}

export async function confirmSession(sessionId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // 1. Fetch session and confirm permissions
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      match: {
        include: {
          requesterProfile: true,
          recipientProfile: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error("Session not found.");
  }

  const match = session.match;
  if (match.requesterProfile.userId !== user.id && match.recipientProfile.userId !== user.id) {
    throw new Error("Unauthorized. You are not a participant in this match.");
  }

  if (session.proposerId === user.id) {
    throw new Error("You cannot confirm a session you proposed. Please wait for your partner to confirm.");
  }

  // 2. Confirm the session
  const updatedSession = await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: "confirmed",
    },
  });

  // 3. Trigger realtime event
  await triggerPusherEvent(match.id, "session-updated", {
    id: updatedSession.id,
    matchId: updatedSession.matchId,
    proposerId: updatedSession.proposerId,
    scheduledTime: updatedSession.scheduledTime.toISOString(),
    status: updatedSession.status,
  });

  return { success: true, session: updatedSession };
}

export async function cancelSession(sessionId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // 1. Fetch session
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      match: {
        include: {
          requesterProfile: true,
          recipientProfile: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error("Session not found.");
  }

  const match = session.match;
  if (match.requesterProfile.userId !== user.id && match.recipientProfile.userId !== user.id) {
    throw new Error("Unauthorized. You are not a participant in this match.");
  }

  // 2. Cancel session
  const updatedSession = await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: "cancelled",
    },
  });

  // 3. Trigger realtime event
  await triggerPusherEvent(match.id, "session-updated", {
    id: updatedSession.id,
    matchId: updatedSession.matchId,
    proposerId: updatedSession.proposerId,
    scheduledTime: updatedSession.scheduledTime.toISOString(),
    status: updatedSession.status,
  });

  return { success: true, session: updatedSession };
}
