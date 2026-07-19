import React from "react";

export default function Loading() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium tracking-wide animate-pulse">Loading Study Buddies...</p>
      </div>
    </div>
  );
}
