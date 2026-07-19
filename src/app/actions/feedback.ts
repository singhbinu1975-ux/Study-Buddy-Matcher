"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function submitFeedback(sessionId: string, thumbsUp: boolean, note?: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  // 1. Fetch session to verify participant rights
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
    throw new Error("Unauthorized. You are not a participant in this session.");
  }

  // 2. Create the Feedback record (preventing duplicates via @@unique([sessionId, userId]))
  try {
    await prisma.feedback.create({
      data: {
        sessionId,
        userId: user.id,
        thumbsUp,
        note: note?.trim() || null,
      },
    });
  } catch (err: any) {
    console.error("Feedback creation error (possible duplicate):", err);
    return { success: false, error: "Feedback was already submitted for this session." };
  }

  // 3. Mark the session completed if both participants have now provided feedback
  const feedbackCount = await prisma.feedback.count({
    where: { sessionId },
  });

  if (feedbackCount >= 2) {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "completed",
      },
    });
  }

  revalidatePath("/app");
  revalidatePath("/matches");
  return { success: true };
}
