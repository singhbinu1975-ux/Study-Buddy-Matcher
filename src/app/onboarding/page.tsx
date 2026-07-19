import React from "react";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const user = await currentUser();

  const dbUrl = process.env.DATABASE_URL;
  const isDbConfigured = dbUrl && !dbUrl.includes("api_key=eyJkYX");

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-y-auto py-12 bg-slate-950 font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl mx-4 p-8 sm:p-10 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <span className="text-sm font-semibold text-indigo-400">Step 1: Onboarding</span>
          <UserButton />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome, <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{user?.firstName || "Student"}</span>!
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Please set up your school and initial study profile to get started matching.
          </p>
        </div>

        {!isDbConfigured ? (
          <div className="p-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300 space-y-3">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Database Connection Required</h3>
            <p className="text-xs">
              To complete onboarding, the application needs a live connection to a PostgreSQL database. Currently, your connection is unconfigured.
            </p>
            <ul className="list-disc list-inside text-[11px] text-rose-400 space-y-1">
              <li>Add a real database URI to <code className="bg-slate-900 px-1 py-0.5 rounded text-white">DATABASE_URL</code> in <code className="bg-slate-900 px-1 py-0.5 rounded text-white">.env</code>.</li>
              <li>Execute <code className="bg-slate-900 px-1.5 py-0.5 rounded text-white">npx prisma db push</code> to instantiate the tables.</li>
            </ul>
          </div>
        ) : (
          <OnboardingForm />
        )}
      </div>
    </div>
  );
}
