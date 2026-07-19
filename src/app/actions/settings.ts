"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function updateNotificationPreferences(
  emailOnRequest: boolean,
  emailOnMessage: boolean,
  emailOnReminder: boolean
) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailOnRequest,
        emailOnMessage,
        emailOnReminder,
      },
    });

    revalidatePath("/app/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update notification preferences:", error);
    throw new Error(error?.message || "Failed to update settings.");
  }
}

export async function deleteUserAccount() {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  try {
    // Delete user from local database. This cascades and deletes profiles, matches, messages, pods, and sessions.
    await prisma.user.delete({
      where: { id: user.id },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete user account:", error);
    throw new Error(error?.message || "Failed to delete account from database.");
  }
}
