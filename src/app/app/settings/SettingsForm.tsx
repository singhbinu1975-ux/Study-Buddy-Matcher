"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk, SignOutButton, UserProfile } from "@clerk/nextjs";
import { updateNotificationPreferences, deleteUserAccount } from "@/app/actions/settings";

interface SettingsFormProps {
  initialPreferences: {
    emailOnRequest: boolean;
    emailOnMessage: boolean;
    emailOnReminder: boolean;
  };
}

export default function SettingsForm({ initialPreferences }: SettingsFormProps) {
  const router = useRouter();
  const { signOut } = useClerk();

  // Tab State: "preferences" or "clerk"
  const [activeTab, setActiveTab] = useState<"preferences" | "clerk">("preferences");

  // Preference States
  const [emailOnRequest, setEmailOnRequest] = useState(initialPreferences.emailOnRequest);
  const [emailOnMessage, setEmailOnMessage] = useState(initialPreferences.emailOnMessage);
  const [emailOnReminder, setEmailOnReminder] = useState(initialPreferences.emailOnReminder);

  // Status States
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await updateNotificationPreferences(
        emailOnRequest,
        emailOnMessage,
        emailOnReminder
      );

      if (res.success) {
        setSuccessMessage("Notification preferences saved successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Failed to update notification settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "WARNING: Are you absolutely sure you want to delete your account? This will permanently wipe all your matches, study profile details, direct messages, and study pod memberships from our database. This action CANNOT be undone."
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await deleteUserAccount();
      if (res.success) {
        // Sign out from Clerk programmatically
        await signOut();
        router.push("/sign-up");
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Failed to delete account from database.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Error & Success Messages */}
      {errorMessage && (
        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs sm:text-sm text-left">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs sm:text-sm text-left">
          {successMessage}
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-white/5 gap-2">
        <button
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "preferences"
              ? "border-indigo-500 text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          App Preferences
        </button>
        <button
          onClick={() => setActiveTab("clerk")}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "clerk"
              ? "border-indigo-500 text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Account Details & Security
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "preferences" ? (
        <div className="space-y-6 text-left">
          {/* Notification settings block */}
          <div className="p-6 sm:p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base sm:text-lg">Notification Preferences</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              We send email notifications to help you stay updated on your matching requests, real-time message alerts, and session schedules. Toggle your options below:
            </p>

            <form onSubmit={handleSavePreferences} className="space-y-4 pt-2">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.02] bg-slate-900/40 hover:bg-slate-900/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={emailOnRequest}
                  onChange={(e) => setEmailOnRequest(e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 rounded border-white/10 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="block text-xs sm:text-sm font-bold text-slate-200">
                    Match Requests
                  </span>
                  <span className="block text-[10px] sm:text-xs text-slate-400 mt-0.5">
                    Receive an email when another student requests to study with you.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.02] bg-slate-900/40 hover:bg-slate-900/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={emailOnMessage}
                  onChange={(e) => setEmailOnMessage(e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 rounded border-white/10 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="block text-xs sm:text-sm font-bold text-slate-200">
                    New Messages
                  </span>
                  <span className="block text-[10px] sm:text-xs text-slate-400 mt-0.5">
                    Receive email updates for new chat messages in matches or pods when you're away.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.02] bg-slate-900/40 hover:bg-slate-900/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={emailOnReminder}
                  onChange={(e) => setEmailOnReminder(e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 rounded border-white/10 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="block text-xs sm:text-sm font-bold text-slate-200">
                    Session Reminders
                  </span>
                  <span className="block text-[10px] sm:text-xs text-slate-400 mt-0.5">
                    Receive email reminders 24 hours before your confirmed study sessions start.
                  </span>
                </div>
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-900/20 text-center"
              >
                {isSaving ? "Saving..." : "Save Preferences"}
              </button>
            </form>
          </div>

          {/* Account Management settings block */}
          <div className="p-6 sm:p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-xl space-y-5">
            <h3 className="font-bold text-white text-base sm:text-lg">Account Actions</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Logout of your current device session, or permanently delete your account history and profiles.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <SignOutButton>
                <button className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs sm:text-sm font-semibold transition-all text-center">
                  Log Out
                </button>
              </SignOutButton>

              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600/10 border border-rose-500/25 hover:bg-rose-600/25 text-rose-300 disabled:opacity-50 text-xs sm:text-sm font-bold transition-all text-center"
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full flex justify-center py-2 overflow-x-auto">
          <UserProfile
            appearance={{
              elements: {
                card: "bg-slate-900 border border-white/5 shadow-2xl w-full",
                headerTitle: "text-white font-extrabold",
                headerSubtitle: "text-slate-400",
                profileSectionTitleText: "text-white font-bold",
                accordionTriggerButton: "text-slate-300 hover:text-white",
                profilePage: "bg-slate-950 text-slate-100",
                navbar: "bg-slate-900 border-r border-white/5",
                navbarButton: "text-slate-400 hover:text-white",
                pageScrollable: "bg-slate-950",
                formFieldLabel: "text-slate-300",
                formFieldInput: "bg-slate-800 border border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500",
                formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors",
                footerActionText: "text-slate-400",
                footerActionLink: "text-indigo-400 hover:text-indigo-300 transition-colors",
                scrollBox: "bg-slate-900 border border-white/5 shadow-2xl w-full max-w-full",
                page: "bg-slate-900 text-white",
                navbarMobileMenuButton: "text-indigo-400",
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
