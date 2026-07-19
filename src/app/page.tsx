import React from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  const isAuthenticated = !!userId;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 font-sans">
      {/* Background gradients and glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      {/* Main glassmorphism card */}
      <div className="relative z-10 w-full max-w-2xl mx-4 p-8 sm:p-12 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl text-center space-y-8">
        
        {/* Decorative Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold uppercase tracking-wider animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
          Study Buddy Matcher - coming soon
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white sm:leading-tight">
            Study Buddy <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Matcher</span>
          </h1>
          <p className="text-slate-400 max-w-md mx-auto text-sm sm:text-base">
            Match with study partners based on subject, availability, and study format. Coordinate sessions, track reliability, and build study pods.
          </p>
        </div>

        {/* Auth CTA Section */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
          {!isAuthenticated ? (
            <>
              <Link
                href="/sign-in"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-slate-950 font-semibold hover:bg-slate-200 transition-all text-center"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:bg-white/10 transition-all text-center"
              >
                Create Account
              </Link>
            </>
          ) : (
            <Link
              href="/app"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/30 text-center"
            >
              Go to App Dashboard
            </Link>
          )}
        </div>

        {/* Feature Teasers from PRD */}
        <div className="grid gap-4 sm:grid-cols-3 text-left pt-4">
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all">
            <h3 className="font-semibold text-white text-sm mb-1">Subject Matching</h3>
            <p className="text-xs text-slate-400">Find partners focused on the exact same class, exam, or topic.</p>
          </div>
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all">
            <h3 className="font-semibold text-white text-sm mb-1">Availability Grid</h3>
            <p className="text-xs text-slate-400">Coordinate schedules and find overlaps automatically.</p>
          </div>
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all">
            <h3 className="font-semibold text-white text-sm mb-1">Flexible Formats</h3>
            <p className="text-xs text-slate-400">Connect for remote video study sessions or in-person syncs.</p>
          </div>
        </div>

        {/* Footer/Teaser Action */}
        <div className="pt-4 border-t border-white/5 text-slate-500 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>Stack: Next.js + Clerk Auth + Tailwind + Prisma</span>
          <span className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">
            View Project Details
          </span>
        </div>
      </div>
    </div>
  );
}
