"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { submitFeedback } from "@/app/actions/feedback";

interface FeedbackPromptProps {
  sessionId: string;
  partnerName: string;
  subject: string;
}

export default function FeedbackPrompt({
  sessionId,
  partnerName,
  subject,
}: FeedbackPromptProps) {
  const router = useRouter();
  const [rating, setRating] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === null) {
      setErrorMsg("Please select thumbs up or thumbs down.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await submitFeedback(sessionId, rating, note);
      if (res.success) {
        // Redirect to matches page to close the matching loop
        router.push("/matches");
      } else {
        setErrorMsg(res.error || "Failed to submit feedback.");
      }
    } catch (err: any) {
      console.error("Error submitting feedback:", err);
      setErrorMsg(err.message || "Failed to submit feedback. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-slate-900 shadow-2xl space-y-6 relative text-left">
        
        {/* Banner header */}
        <div className="space-y-1">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
            Close the loop
          </span>
          <h2 className="text-2xl font-extrabold text-white pt-1">
            Session Feedback
          </h2>
          <p className="text-xs text-slate-400">
            How was your study session with <strong className="text-slate-200">{partnerName}</strong> for <strong className="text-indigo-400">{subject}</strong>?
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Rating Selection: Thumbs Up / Down */}
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Rate Session
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setRating(true);
                  setErrorMsg("");
                }}
                className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 border transition-all text-sm font-bold ${
                  rating === true
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                    : "border-white/10 bg-slate-950/50 text-slate-400 hover:text-slate-200 hover:border-white/20"
                }`}
              >
                👍 Thumbs Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setRating(false);
                  setErrorMsg("");
                }}
                className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 border transition-all text-sm font-bold ${
                  rating === false
                    ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-900/20"
                    : "border-white/10 bg-slate-950/50 text-slate-400 hover:text-slate-200 hover:border-white/20"
                }`}
              >
                👎 Thumbs Down
              </button>
            </div>
          </div>

          {/* Notes Input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Notes / Feedback (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How can your study partner improve, or what did they do well? (Keep it constructive)..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-950 text-white text-xs sm:text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center"
            >
              {isSubmitting ? "Submitting..." : "Submit & Find Next Match"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
