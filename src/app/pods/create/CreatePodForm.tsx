"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createPod } from "@/app/actions/pod";

interface MatchItem {
  id: string;
  name: string;
  school: string;
  subject: string;
}

interface CreatePodFormProps {
  matches: MatchItem[];
}

export default function CreatePodForm({ matches }: CreatePodFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [invitedProfileIds, setInvitedProfileIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckboxChange = (profileId: string) => {
    setInvitedProfileIds((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createPod(name, subject, invitedProfileIds);
      if (res.success && res.podId) {
        router.push(`/pods/${res.podId}/chat`);
        router.refresh();
      } else {
        setError("Failed to create pod. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
          Pod Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. MCDB 101 Study Group"
          required
          className="w-full h-11 px-4 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
        />
      </div>

      <div>
        <label className="block text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
          Subject / Exam
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Molecular Biology"
          required
          className="w-full h-11 px-4 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
        />
      </div>

      <div>
        <label className="block text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
          Invite Match Partners
        </label>
        {matches.length > 0 ? (
          <div className="max-h-48 overflow-y-auto border border-white/5 bg-slate-950 rounded-xl p-3 space-y-2">
            {matches.map((match) => (
              <label
                key={match.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-white/[0.02] bg-white/[0.01] hover:bg-white/[0.03] cursor-pointer transition-colors text-xs"
              >
                <input
                  type="checkbox"
                  checked={invitedProfileIds.includes(match.id)}
                  onChange={() => handleCheckboxChange(match.id)}
                  className="rounded border-white/10 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-200">{match.name}</div>
                  <div className="text-[10px] text-slate-500">{match.school} • Subject: {match.subject}</div>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01] text-xs text-slate-400">
            You don't have any active match partners yet. 
            Connect with buddies first to invite them.
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold transition-all shadow-lg shadow-indigo-900/20 text-center text-sm"
        >
          {isSubmitting ? "Creating Pod..." : "Create Pod"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold transition-all text-center text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
