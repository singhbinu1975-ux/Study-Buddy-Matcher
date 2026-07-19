"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console (will appear in Vercel real-time logs)
    console.error("Next.js App Runtime Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 font-sans text-slate-100 p-6">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center space-y-6 max-w-md">
        <div className="h-16 w-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 text-3xl font-extrabold mx-auto border border-rose-500/20">
          ⚠️
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white">Something went wrong!</h2>
          <p className="text-sm text-slate-400">
            An unexpected error occurred in the application. We've logged this details to our server dashboard.
          </p>
          {error.message && (
            <p className="text-xs bg-slate-900 border border-white/5 text-rose-300 p-3 rounded-xl mt-3 font-mono break-words text-left">
              Error details: {error.message}
            </p>
          )}
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-900/20 cursor-pointer"
          >
            Try Again
          </button>
          <a
            href="/app"
            className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-sm transition-all text-center"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
