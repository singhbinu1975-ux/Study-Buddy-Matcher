"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export interface AvailabilityBlock {
  day: string;
  startTime: string;
  endTime: string;
}

export async function saveOnboardingData(data: {
  school: string;
  subject: string;
  goal: string;
  format: string;
  location?: string | null;
  availability: AvailabilityBlock[];
}) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in to complete onboarding.");
  }

  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Student";
  const email = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress || "";

  if (!email) {
    throw new Error("No primary email address found on Clerk user profile.");
  }

  // 1. Upsert User in database
  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      name,
      email,
      school: data.school,
    },
    create: {
      id: user.id,
      name,
      email,
      school: data.school,
    },
  });

  // 2. Create the study profile
  await prisma.studyProfile.create({
    data: {
      userId: user.id,
      subject: data.subject,
      goal: data.goal,
      format: data.format,
      location: data.location || null,
      availability: JSON.stringify(data.availability),
    },
  });

  // 3. Redirect to main app dashboard
  revalidatePath("/app");
  redirect("/app");
}

export async function updateProfileData(data: {
  profileId: string;
  school: string;
  subject: string;
  goal: string;
  format: string;
  location?: string | null;
  availability: AvailabilityBlock[];
}) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in to edit your profile.");
  }

  // 1. Update user school details
  await prisma.user.update({
    where: { id: user.id },
    data: {
      school: data.school,
    },
  });

  // 2. Update specific study profile
  await prisma.studyProfile.update({
    where: { id: data.profileId },
    data: {
      subject: data.subject,
      goal: data.goal,
      format: data.format,
      location: data.location || null,
      availability: JSON.stringify(data.availability),
    },
  });

  // 3. Revalidate dashboard path and redirect to /app
  revalidatePath("/app");
  revalidatePath("/app/profile");
  redirect("/app");
}
