import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";
import { AvailabilityBlock } from "@/app/actions/profile";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default async function EditProfilePage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch the Postgres user and their study profiles
  let dbUser = null;
  let activeProfile = null;
  let dbError = null;

  const dbUrl = process.env.DATABASE_URL;
  const isDbConfigured = dbUrl && !dbUrl.includes("api_key=eyJkYX");

  if (!isDbConfigured) {
    dbError = "DATABASE_URL is not configured. Please set up a real PostgreSQL database on Supabase or Railway, update your .env file, and run 'npx prisma db push' as explained in DEPLOYMENT.md.";
  } else {
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          profiles: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
      activeProfile = dbUser?.profiles?.[0];
    } catch (e: any) {
      console.error("Prisma Database Query Error in EditProfilePage:", e);
      dbError = e?.message || "Failed to reach the database server.";
    }
  }

  // If there's no DB error, but they have not completed onboarding, send them there first
  if (!dbError && (!dbUser || !activeProfile)) {
    redirect("/onboarding");
  }

  // Parse availability JSON safely
  let availabilityList: AvailabilityBlock[] = [];
  try {
    if (activeProfile?.availability) {
      const parsed = typeof activeProfile.availability === "string" 
        ? JSON.parse(activeProfile.availability) 
        : activeProfile.availability;
      if (Array.isArray(parsed)) {
        availabilityList = parsed as AvailabilityBlock[];
      }
    }
  } catch (e) {
    console.error("Error parsing availability JSON:", e);
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/app" className="flex items-center gap-3">
          <span className="text-xl font-extrabold tracking-tight text-white">
            Study Buddy <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Matcher</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <UserButton />
        </div>
      </nav>

      {/* Main Form Area */}
      <main className="relative z-10 flex-1 max-w-xl w-full mx-auto px-6 py-12 flex flex-col justify-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-white">
            Edit Your Profile
          </h2>
          <p className="text-slate-400 text-sm">
            Modify your subject interest, availability slots, goal, or format. Updates will apply instantly to your matching profile.
          </p>
        </div>

        {dbError ? (
          <div className="p-6 sm:p-8 rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-300 space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-white">Database Connection Issue</h3>
              <p className="text-sm">
                Could not load your profile details because the database is offline or unconfigured.
              </p>
            </div>
            <p className="text-xs">
              Please check your <code className="bg-slate-900 px-1 py-0.5 rounded text-rose-200">DATABASE_URL</code> in <code className="bg-slate-900 px-1 py-0.5 rounded text-rose-200">.env</code>.
            </p>
            <div className="pt-4 border-t border-rose-500/10">
              <Link
                href="/app"
                className="inline-flex px-4 py-2 bg-rose-950/50 border border-rose-500/30 text-rose-200 rounded-lg text-sm hover:bg-rose-900/30 transition-colors"
              >
                Go back to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          dbUser && activeProfile && (
            <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl">
              <ProfileForm
                profileId={activeProfile.id}
                initialSchool={dbUser.school}
                initialSubject={activeProfile.subject}
                initialGoal={activeProfile.goal}
                initialFormat={activeProfile.format}
                initialLocation={activeProfile.location}
                initialAvailability={availabilityList}
              />
            </div>
          )
        )}
      </main>
    </div>
  );
}
