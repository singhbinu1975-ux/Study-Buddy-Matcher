import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch the current user record for database preferences
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      emailOnRequest: true,
      emailOnMessage: true,
      emailOnReminder: true,
    },
  });

  if (!dbUser) {
    redirect("/onboarding");
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

      {/* Shared Header Navigation */}
      <Header />

      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-start space-y-6">
        <div className="space-y-2 text-left">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Account Settings</h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Manage your study buddy notification preferences, edit your profile details, or manage authentication settings.
          </p>
        </div>

        <div className="w-full">
          <SettingsForm
            initialPreferences={{
              emailOnRequest: dbUser.emailOnRequest,
              emailOnMessage: dbUser.emailOnMessage,
              emailOnReminder: dbUser.emailOnReminder,
            }}
          />
        </div>
      </main>
    </div>
  );
}
