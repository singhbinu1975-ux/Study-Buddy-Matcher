"use client";

import React, { useState } from "react";
import { updateProfileData, AvailabilityBlock } from "@/app/actions/profile";
import Link from "next/link";

const GOAL_OPTIONS = [
  { value: "exam_prep", label: "Exam Preparation" },
  { value: "homework_help", label: "Homework Help" },
  { value: "general_practice", label: "General Practice / Study" },
  { value: "language_exchange", label: "Language Exchange" },
];

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface ProfileFormProps {
  profileId: string;
  initialSchool: string;
  initialSubject: string;
  initialGoal: string;
  initialFormat: string;
  initialLocation: string | null;
  initialAvailability: AvailabilityBlock[];
}

export default function ProfileForm({
  profileId,
  initialSchool,
  initialSubject,
  initialGoal,
  initialFormat,
  initialLocation,
  initialAvailability,
}: ProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [school, setSchool] = useState(initialSchool);
  const [subject, setSubject] = useState(initialSubject);
  const [goal, setGoal] = useState(initialGoal);
  const [format, setFormat] = useState(initialFormat);
  const [location, setLocation] = useState(initialLocation || "");

  // Availability Fields
  const [availability, setAvailability] = useState<AvailabilityBlock[]>(initialAvailability);
  const [availDay, setAvailDay] = useState("Monday");
  const [availStart, setAvailStart] = useState("09:00");
  const [availEnd, setAvailEnd] = useState("11:00");

  const handleAddAvailability = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!availStart || !availEnd) return;
    if (availStart >= availEnd) {
      setError("Start time must be before end time.");
      return;
    }
    setError(null);
    setAvailability((prev) => [
      ...prev,
      { day: availDay, startTime: availStart, endTime: availEnd },
    ]);
  };

  const handleRemoveAvailability = (index: number) => {
    setAvailability((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school.trim() || !subject.trim()) {
      setError("Please fill out school and subject fields.");
      return;
    }
    if (availability.length === 0) {
      setError("Please add at least one weekly availability block.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await updateProfileData({
        profileId,
        school,
        subject,
        goal,
        format,
        location: format !== "video" ? location : null,
        availability,
      });
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* School Information */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-300">
          School / University
        </label>
        <input
          type="text"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          placeholder="e.g. Stanford University"
          required
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-300">
          Subject / Class / Exam Name
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Calculus II, MCAT Prep"
          required
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Goal & Format */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-300">
            Study Goal
          </label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            {GOAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-300">
            Preferred Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="video">Remote Video</option>
            <option value="in_person">In-Person</option>
            <option value="either">Either (Video or In-Person)</option>
          </select>
        </div>
      </div>

      {/* Conditional Location */}
      {format !== "video" && (
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-300">
            Rough Location (City / Campus Area)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Main Campus Library"
            required
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
      )}

      {/* Availability Section */}
      <div className="border-t border-white/5 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Weekly Availability
        </h3>

        {/* Add availability row */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-4 items-end bg-slate-900/50 p-4 rounded-2xl border border-white/5">
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-400">Day</label>
            <select
              value={availDay}
              onChange={(e) => setAvailDay(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-400">Start Time</label>
            <input
              type="time"
              value={availStart}
              onChange={(e) => setAvailStart(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-400">End Time</label>
            <input
              type="time"
              value={availEnd}
              onChange={(e) => setAvailEnd(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={handleAddAvailability}
            className="w-full px-4 py-2.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold text-sm transition-all border border-indigo-500/20"
          >
            + Add Time
          </button>
        </div>

        {/* Display Current Added Availability blocks */}
        {availability.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium">Added Schedule Slots:</p>
            <div className="flex flex-wrap gap-2">
              {availability.map((block, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-slate-950 text-xs text-slate-200"
                >
                  <span className="font-semibold text-indigo-400">{block.day}</span>:{" "}
                  {block.startTime} - {block.endTime}
                  <button
                    type="button"
                    onClick={() => handleRemoveAvailability(idx)}
                    className="text-slate-500 hover:text-slate-200 font-bold ml-1 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No availability blocks added yet. (Add at least 1)</p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Link
          href="/app"
          className="flex-1 h-12 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all text-center"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex-2 h-12 flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 px-8"
        >
          {loading ? "Saving Changes..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
