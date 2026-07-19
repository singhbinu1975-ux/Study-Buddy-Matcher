"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { AvailabilityBlock } from "@/app/actions/profile";

const GOAL_LABELS: Record<string, string> = {
  exam_prep: "Exam Prep",
  homework_help: "Homework Help",
  general_practice: "General Practice",
  language_exchange: "Language Exchange",
};

const FORMAT_LABELS: Record<string, string> = {
  video: "Remote Video",
  in_person: "In-Person",
  either: "Either Format",
};

interface PartnerProfile {
  id: string;
  userId: string;
  subject: string;
  goal: string;
  format: string;
  location: string | null;
  availability: any;
  user: {
    name: string;
    school: string;
    email: string;
  };
}

interface MatchesLayoutProps {
  myProfile: {
    id: string;
    subject: string;
    goal: string;
    format: string;
    location: string | null;
    availability: any;
  };
  mySchool: string;
  allProfiles: PartnerProfile[];
}

// Check time overlap: max(startA, startB) < min(endA, endB)
function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

// Parse availability JSON safely
function parseAvailability(availRaw: any): AvailabilityBlock[] {
  try {
    if (!availRaw) return [];
    const parsed = typeof availRaw === "string" ? JSON.parse(availRaw) : availRaw;
    return Array.isArray(parsed) ? (parsed as AvailabilityBlock[]) : [];
  } catch {
    return [];
  }
}

export default function MatchesLayout({
  myProfile,
  mySchool,
  allProfiles,
}: MatchesLayoutProps) {
  const [search, setSearch] = useState("");

  const myAvails = useMemo(() => parseAvailability(myProfile.availability), [myProfile.availability]);

  // Compute matched score and sort
  const rankedMatches = useMemo(() => {
    return allProfiles
      .map((partner) => {
        let score = 0;
        let reasons: string[] = [];

        // 1. Same Subject (+1000)
        const isSameSubject =
          partner.subject.trim().toLowerCase() === myProfile.subject.trim().toLowerCase();
        if (isSameSubject) {
          score += 1000;
          reasons.push("Same Subject");
        }

        // 2. Overlapping Availability (+100)
        const partnerAvails = parseAvailability(partner.availability);
        let hasOverlap = false;
        for (const myAv of myAvails) {
          for (const partnerAv of partnerAvails) {
            if (myAv.day === partnerAv.day && timesOverlap(myAv.startTime, myAv.endTime, partnerAv.startTime, partnerAv.endTime)) {
              hasOverlap = true;
              break;
            }
          }
          if (hasOverlap) break;
        }
        if (hasOverlap) {
          score += 100;
          reasons.push("Overlapping Availability");
        }

        // 3. Same Format (+10)
        const isSameFormat =
          partner.format === myProfile.format ||
          partner.format === "either" ||
          myProfile.format === "either";
        if (isSameFormat) {
          score += 10;
          reasons.push(`Preferred format matches (${FORMAT_LABELS[partner.format] || partner.format})`);
        }

        // 4. Same Location (+1)
        const isSameLocation =
          myProfile.location &&
          partner.location &&
          partner.location.trim().toLowerCase() === myProfile.location.trim().toLowerCase();
        if (isSameLocation) {
          score += 1;
          reasons.push(`Same Location (${partner.location})`);
        }

        return {
          ...partner,
          score,
          reasons,
          parsedAvailability: partnerAvails,
        };
      })
      .filter((partner) => {
        // Filter by subject search
        if (!search.trim()) return true;
        return partner.subject.toLowerCase().includes(search.toLowerCase());
      })
      .sort((a, b) => b.score - a.score); // Highest score first
  }, [allProfiles, myProfile, myAvails, search]);

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative max-w-md mx-auto sm:mx-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter matches by subject... (e.g. Physics)"
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Matches Grid */}
      {rankedMatches.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {rankedMatches.map((partner) => {
            const hasSameSubject = partner.reasons.includes("Same Subject");
            const hasOverlap = partner.reasons.includes("Overlapping Availability");

            return (
              <Link
                href={`/matches/${partner.id}`}
                key={partner.id}
                className="group block p-6 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-xl shadow-xl transition-all space-y-4 hover:border-white/10"
              >
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {partner.user.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{partner.user.school}</p>
                  </div>
                  
                  {/* Matching Indicator Badges */}
                  <div className="flex flex-col items-end gap-1.5">
                    {hasSameSubject && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold text-indigo-300 uppercase tracking-wider">
                        Same Subject
                      </span>
                    )}
                    {hasOverlap && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-300 uppercase tracking-wider">
                        Schedule Overlaps
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-xs border-t border-white/5 pt-3">
                  <div>
                    <span className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">Subject</span>
                    <span className="text-slate-200 font-semibold text-sm">{partner.subject}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">Study Goal</span>
                    <span className="text-slate-200 font-semibold">{GOAL_LABELS[partner.goal] || partner.goal}</span>
                  </div>
                </div>

                {/* Format Preference & Location */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                  <span>Format: <strong>{FORMAT_LABELS[partner.format] || partner.format}</strong></span>
                  {partner.location && (
                    <span className="text-[11px] bg-slate-900 px-2 py-1 rounded-md border border-white/5 text-slate-300">
                      📍 {partner.location}
                    </span>
                  )}
                </div>

                {/* Availability Preview */}
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Availability Overview</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {partner.parsedAvailability.map((block, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-950 text-[10px] text-slate-400 border border-white/5"
                      >
                        {block.day.slice(0, 3)}: {block.startTime}-{block.endTime}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
          <p className="text-slate-400 font-medium">No study buddy matches found.</p>
          <p className="text-xs text-slate-500 mt-1">
            {search.trim() ? "Try searching for a different subject keyword." : "Check back later when more students register."}
          </p>
        </div>
      )}
    </div>
  );
}
