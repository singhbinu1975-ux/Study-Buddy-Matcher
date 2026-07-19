"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { reportUser, blockUser } from "@/app/actions/safety";

interface SafetyActionsProps {
  targetUserId: string;
  targetName: string;
}

export default function SafetyActions({ targetUserId, targetName }: SafetyActionsProps) {
  const router = useRouter();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reason, setReason] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await reportUser(targetUserId, reason);
      if (res.success) {
        setSuccessMessage("Thank you. The report has been logged and our team will review it.");
        setReason("");
        setTimeout(() => {
          setShowReportModal(false);
          setSuccessMessage("");
        }, 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit report. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await blockUser(targetUserId);
      if (res.success) {
        setShowBlockModal(false);
        // Redirect blocker to browse matches view
        router.push("/matches");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to block user. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
      {/* Report Button Trigger */}
      <button
        onClick={() => {
          setErrorMessage("");
          setShowReportModal(true);
        }}
        className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-300 text-xs font-semibold transition-all text-center"
      >
        🚩 Report
      </button>

      {/* Block Button Trigger */}
      <button
        onClick={() => {
          setErrorMessage("");
          setShowBlockModal(true);
        }}
        className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all text-center"
      >
        🚫 Block
      </button>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleReport}
            className="w-full max-w-sm p-6 rounded-3xl border border-white/10 bg-slate-900 shadow-2xl space-y-4 text-left"
          >
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Report {targetName}</h4>
              <p className="text-[11px] text-slate-400">Please describe why you are reporting this student.</p>
            </div>

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {!successMessage && (
              <>
                <textarea
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for report (harassment, spam, inappropriate profile, etc.)..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white text-xs sm:text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !reason.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-555 text-white font-bold text-xs transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Report"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportModal(false);
                      setReason("");
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-3xl border border-white/10 bg-slate-900 shadow-2xl space-y-4 text-left">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Block {targetName}?</h4>
              <p className="text-[11px] text-slate-400">
                This will instantly hide their profile, cancel any requests, erase active chats, and prevent them from matching with you in the future.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleBlock}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Blocking..." : "Confirm Block"}
              </button>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
