"use client";

import React, { useState, useEffect, useRef } from "react";
import { sendPodMessage, proposePodSession, confirmPodSession, cancelPodSession } from "@/app/actions/pod";
import Pusher from "pusher-js";

interface MessageItem {
  id: string;
  podId: string;
  senderId: string;
  content: string;
  createdAt: string;
  senderName?: string;
  isOptimistic?: boolean;
}

interface SessionItem {
  id: string;
  podId: string;
  proposerId: string;
  scheduledTime: string;
  status: string;
  confirmations: string[]; // List of user IDs who confirmed
  totalMembers: number;
}

interface PodChatBoxProps {
  podId: string;
  currentUserId: string;
  initialMessages: MessageItem[];
  podName: string;
  initialSession: SessionItem | null;
  membersMap: Record<string, string>;
}

export default function PodChatBox({
  podId,
  currentUserId,
  initialMessages,
  podName,
  initialSession,
  membersMap,
}: PodChatBoxProps) {
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [session, setSession] = useState<SessionItem | null>(initialSession);
  const [inputText, setInputText] = useState("");
  
  // Scheduling UI state
  const [showScheduler, setShowScheduler] = useState(false);
  const [inputDate, setInputDate] = useState("");
  const [inputTime, setInputTime] = useState("");
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  const isPusherConfigured = !!(pusherKey && pusherCluster);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to Pusher channel for real-time messages & session updates
  useEffect(() => {
    if (!isPusherConfigured) {
      console.warn("Pusher keys are not configured. Real-time message/session sync is disabled.");
      return;
    }

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    const channel = pusher.subscribe(`pod-${podId}`);
    
    // Bind message pushes
    channel.bind("message", (newMessage: MessageItem) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });

    // Bind session updates
    channel.bind("session-updated", (updatedSession: SessionItem) => {
      setSession(updatedSession);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [podId, isPusherConfigured, pusherKey, pusherCluster]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText("");

    // 1. Optimistic UI update
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMessage: MessageItem = {
      id: tempId,
      podId,
      senderId: currentUserId,
      content: textToSend,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      senderName: membersMap[currentUserId] || "You",
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    // 2. Fire Server Action
    try {
      const res = await sendPodMessage(podId, textToSend);
      if (res.success && res.message) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...res.message, isOptimistic: false } : msg
          )
        );
      }
    } catch (err) {
      console.error("Failed to post message:", err);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    }
  };

  // Scheduling Server Action Handlers
  const handleProposeSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDate || !inputTime) return;

    setIsSubmittingSession(true);
    try {
      const isoString = new Date(`${inputDate}T${inputTime}`).toISOString();
      const res = await proposePodSession(podId, isoString);
      if (res.success && res.session) {
        setSession({
          id: res.session.id,
          podId: res.session.podId,
          proposerId: res.session.proposerId,
          scheduledTime: res.session.scheduledTime.toISOString(),
          status: res.session.status,
          confirmations: [res.session.proposerId], // proposer auto-confirms
          totalMembers: session?.totalMembers || 2, // will be updated by trigger event or database
        });
        setShowScheduler(false);
        setInputDate("");
        setInputTime("");
      }
    } catch (err) {
      console.error("Error proposing session:", err);
    } finally {
      setIsSubmittingSession(false);
    }
  };

  const handleConfirmSession = async () => {
    if (!session) return;
    try {
      const res = await confirmPodSession(session.id);
      if (res.success && res.session) {
        // Local fallback update in case websocket delays
        setSession((prev) => {
          if (!prev) return null;
          const newConfirmations = prev.confirmations.includes(currentUserId)
            ? prev.confirmations
            : [...prev.confirmations, currentUserId];
          return {
            ...prev,
            status: res.session.status,
            confirmations: newConfirmations,
          };
        });
      }
    } catch (err) {
      console.error("Error confirming session:", err);
    }
  };

  const handleCancelSession = async () => {
    if (!session) return;
    try {
      const res = await cancelPodSession(session.id);
      if (res.success && res.session) {
        setSession({
          id: res.session.id,
          podId: res.session.podId,
          proposerId: res.session.proposerId,
          scheduledTime: res.session.scheduledTime.toISOString(),
          status: res.session.status,
          confirmations: [],
          totalMembers: 0,
        });
      }
    } catch (err) {
      console.error("Error cancelling session:", err);
    }
  };

  const hasConfirmed = session?.confirmations.includes(currentUserId);
  const requiredCount = session ? Math.floor(session.totalMembers / 2) + 1 : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/40 text-left relative">

      {/* Dynamic Session Banner (Sticky at Top of Chat Container) */}
      {session && session.status === "proposed" && (
        <div className="px-5 py-3.5 bg-indigo-500/10 border-b border-indigo-500/25 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
          <div className="text-slate-300">
            📅 Session proposed for <strong>{new Date(session.scheduledTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</strong>. 
            <span className="ml-1 text-indigo-400 font-semibold">
              Confirmations: {session.confirmations.length} / {session.totalMembers} (Requires {requiredCount})
            </span>
          </div>
          <div className="flex gap-2">
            {!hasConfirmed && (
              <button
                onClick={handleConfirmSession}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
              >
                Confirm
              </button>
            )}
            {hasConfirmed && (
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 font-semibold">
                ✓ Confirmed
              </span>
            )}
            {session.proposerId === currentUserId && (
              <button
                onClick={handleCancelSession}
                className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 transition-colors font-semibold"
              >
                Cancel Proposal
              </button>
            )}
          </div>
        </div>
      )}

      {session && session.status === "confirmed" && (
        <div className="px-5 py-3.5 bg-emerald-500/10 border-b border-emerald-500/25 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
          <div className="text-slate-300">
            🎉 <strong>Upcoming Group Session Confirmed:</strong> scheduled on <strong>{new Date(session.scheduledTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</strong>!
          </div>
          {session.proposerId === currentUserId && (
            <button
              onClick={handleCancelSession}
              className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 transition-colors font-semibold"
            >
              Cancel Session
            </button>
          )}
        </div>
      )}

      {/* Schedule a Session Trigger Button overlay if no active/pending session */}
      {(!session || session.status === "cancelled") && (
        <div className="px-5 py-2.5 bg-slate-900/40 border-b border-white/5 flex items-center justify-between text-xs">
          <span className="text-slate-400">Propose a calendar date/time to meet up and study:</span>
          <button
            onClick={() => setShowScheduler(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors"
          >
            📅 Schedule a Session
          </button>
        </div>
      )}

      {/* Scheduling Interactive Modal Form Overlay */}
      {showScheduler && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleProposeSession}
            className="w-full max-w-sm p-6 rounded-3xl border border-white/10 bg-slate-900 shadow-2xl space-y-4"
          >
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Propose Pod Study Session</h4>
              <p className="text-[11px] text-slate-400">Select a date and time for the pod study session.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-950 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Time</label>
                <input
                  type="time"
                  required
                  value={inputTime}
                  onChange={(e) => setInputTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-950 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmittingSession}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-colors"
              >
                {isSubmittingSession ? "Sending..." : "Send Proposal"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowScheduler(false);
                  setInputDate("");
                  setInputTime("");
                }}
                className="flex-1 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {messages.length > 0 ? (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[75%] space-y-1 ${
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 px-1">
                  <span className="font-semibold text-slate-400">
                    {msg.senderName || "Student"}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.isOptimistic && (
                    <span className="text-amber-400 font-bold tracking-widest animate-pulse">
                      ...sending
                    </span>
                  )}
                </div>

                <div
                  className={`p-3 rounded-2xl text-xs sm:text-sm font-medium ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-950/20"
                      : "bg-slate-800 text-slate-200 rounded-tl-none border border-white/5"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-1">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">No Messages Yet</p>
            <p className="text-slate-400 text-xs">Be the first to say hello to the study pod!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Panel */}
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-slate-900/60 border-t border-white/5 flex items-center gap-3"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Type a message to ${podName}...`}
          className="flex-1 px-4 h-11 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs sm:text-sm"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-900/20 flex items-center justify-center"
        >
          Send
        </button>
      </form>
    </div>
  );
}
