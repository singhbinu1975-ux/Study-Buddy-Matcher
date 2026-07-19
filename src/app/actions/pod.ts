"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import Pusher from "pusher";

// Helper to trigger Pusher realtime notifications for pods
async function triggerPodPusherEvent(podId: string, eventName: string, data: any) {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (appId && key && secret && cluster) {
    try {
      const pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
      await pusher.trigger(`pod-${podId}`, eventName, data);
    } catch (e) {
      console.error(`Pusher error in triggerPodPusherEvent [${eventName}]:`, e);
    }
  } else {
    console.warn("Pusher keys are not configured. Real-time pod event skipped.");
  }
}

export async function createPod(name: string, subject: string, invitedProfileIds: string[]) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  if (!name || !name.trim()) {
    throw new Error("Pod name cannot be empty.");
  }

  if (!subject || !subject.trim()) {
    throw new Error("Pod subject cannot be empty.");
  }

  // 1. Fetch creator's user record (verify they exist in our DB)
  const dbCreator = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbCreator) {
    throw new Error("Please complete onboarding first.");
  }

  // 2. Map invited profile IDs to user IDs
  const invitedProfiles = await prisma.studyProfile.findMany({
    where: {
      id: { in: invitedProfileIds },
    },
    select: {
      userId: true,
    },
  });

  const memberUserIds = Array.from(
    new Set([user.id, ...invitedProfiles.map((p) => p.userId)])
  );

  // 3. Create the Pod and add all members
  const pod = await prisma.pod.create({
    data: {
      name: name.trim(),
      subject: subject.trim(),
      createdBy: user.id,
      members: {
        create: memberUserIds.map((userId) => ({
          userId,
        })),
      },
    },
  });

  revalidatePath("/app");
  revalidatePath("/matches");
  return { success: true, podId: pod.id };
}

export async function sendPodMessage(podId: string, content: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  if (!content || !content.trim()) {
    throw new Error("Message content cannot be empty.");
  }

  // 1. Verify user is a member of the pod
  const isMember = await prisma.podMember.findFirst({
    where: {
      podId,
      userId: user.id,
    },
  });

  if (!isMember) {
    throw new Error("Unauthorized. You are not a member of this pod.");
  }

  // 2. Save message to database
  const message = await prisma.podMessage.create({
    data: {
      podId,
      senderId: user.id,
      content: content.trim(),
    },
  });

  // 3. Trigger Pusher Real-Time Notification
  const senderName = user.fullName || user.firstName || "Student";
  await triggerPodPusherEvent(podId, "message", {
    id: message.id,
    podId: message.podId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    senderName,
  });

  return {
    success: true,
    message: {
      id: message.id,
      podId: message.podId,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      senderName,
    },
  };
}

export async function proposePodSession(podId: string, scheduledTimeIso: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // 1. Verify user is a member of the pod
  const isMember = await prisma.podMember.findFirst({
    where: {
      podId,
      userId: user.id,
    },
  });

  if (!isMember) {
    throw new Error("Unauthorized. You are not a member of this pod.");
  }

  const scheduledTime = new Date(scheduledTimeIso);

  // 2. Fetch any existing proposed or confirmed session to update, otherwise create new
  const existingSession = await prisma.podSession.findFirst({
    where: {
      podId,
      status: { in: ["proposed", "confirmed"] },
    },
  });

  let session;
  if (existingSession) {
    // Delete existing confirmations
    await prisma.podSessionConfirmation.deleteMany({
      where: { podSessionId: existingSession.id },
    });

    session = await prisma.podSession.update({
      where: { id: existingSession.id },
      data: {
        scheduledTime,
        proposerId: user.id,
        status: "proposed",
      },
    });
  } else {
    session = await prisma.podSession.create({
      data: {
        podId,
        scheduledTime,
        proposerId: user.id,
        status: "proposed",
      },
    });
  }

  // 3. Automatically add a confirmation for the proposer
  await prisma.podSessionConfirmation.create({
    data: {
      podSessionId: session.id,
      userId: user.id,
    },
  });

  // 4. Fetch the total number of members in this pod
  const totalMembers = await prisma.podMember.count({
    where: { podId },
  });

  // Threshold: majority (>50%) of members
  const confirmationsCount = 1;
  const isMajority = confirmationsCount > totalMembers / 2;

  let finalSession = session;
  if (isMajority) {
    finalSession = await prisma.podSession.update({
      where: { id: session.id },
      data: {
        status: "confirmed",
      },
    });
  }

  // 5. Dispatch realtime event
  const confirmations = await prisma.podSessionConfirmation.findMany({
    where: { podSessionId: finalSession.id },
    select: { userId: true },
  });

  await triggerPodPusherEvent(podId, "session-updated", {
    id: finalSession.id,
    podId: finalSession.podId,
    proposerId: finalSession.proposerId,
    scheduledTime: finalSession.scheduledTime.toISOString(),
    status: finalSession.status,
    confirmations: confirmations.map((c) => c.userId),
    totalMembers,
  });

  return { success: true, session: finalSession };
}

export async function confirmPodSession(sessionId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // 1. Fetch session
  const session = await prisma.podSession.findUnique({
    where: { id: sessionId },
    include: {
      pod: {
        include: {
          members: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error("Session not found.");
  }

  // 2. Verify user is a member of the pod
  const memberIds = session.pod.members.map((m) => m.userId);
  if (!memberIds.includes(user.id)) {
    throw new Error("Unauthorized. You are not a member of this pod.");
  }

  // 3. Upsert confirmation for this user
  await prisma.podSessionConfirmation.upsert({
    where: {
      podSessionId_userId: {
        podSessionId: sessionId,
        userId: user.id,
      },
    },
    update: {},
    create: {
      podSessionId: sessionId,
      userId: user.id,
    },
  });

  // 4. Check if majority confirmation is met
  const confirmationsCount = await prisma.podSessionConfirmation.count({
    where: { podSessionId: sessionId },
  });

  const totalMembers = session.pod.members.length;
  const isMajority = confirmationsCount > totalMembers / 2;

  let updatedSession = session;
  if (isMajority && session.status !== "confirmed") {
    updatedSession = await prisma.podSession.update({
      where: { id: sessionId },
      data: {
        status: "confirmed",
      },
      include: {
        pod: {
          include: {
            members: true,
          },
        },
      },
    });
  }

  // 5. Trigger realtime event
  const confirmations = await prisma.podSessionConfirmation.findMany({
    where: { podSessionId: sessionId },
    select: { userId: true },
  });

  await triggerPodPusherEvent(session.podId, "session-updated", {
    id: updatedSession.id,
    podId: updatedSession.podId,
    proposerId: updatedSession.proposerId,
    scheduledTime: updatedSession.scheduledTime.toISOString(),
    status: updatedSession.status,
    confirmations: confirmations.map((c) => c.userId),
    totalMembers,
  });

  return { success: true, session: updatedSession };
}

export async function cancelPodSession(sessionId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // 1. Fetch session
  const session = await prisma.podSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("Session not found.");
  }

  if (session.proposerId !== user.id) {
    throw new Error("Unauthorized. Only the proposer can cancel this session.");
  }

  // 2. Cancel session and delete confirmations
  await prisma.podSessionConfirmation.deleteMany({
    where: { podSessionId: sessionId },
  });

  const updatedSession = await prisma.podSession.update({
    where: { id: sessionId },
    data: {
      status: "cancelled",
    },
  });

  // 3. Trigger realtime event
  await triggerPodPusherEvent(session.podId, "session-updated", {
    id: updatedSession.id,
    podId: updatedSession.podId,
    proposerId: updatedSession.proposerId,
    scheduledTime: updatedSession.scheduledTime.toISOString(),
    status: updatedSession.status,
    confirmations: [],
    totalMembers: 0,
  });

  return { success: true, session: updatedSession };
}
