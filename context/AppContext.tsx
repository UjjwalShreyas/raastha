"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { TRANSLATIONS, HazardIssue, MOCK_ISSUES, MOCK_CITIZEN_HISTORY } from "@/lib/mockData";
import { useSpeech } from "@/hooks/useSpeech";

export type LanguageCode = "EN" | "HI" | "TE";

interface AppContextType {
  // Language
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;

  // Voice
  voice: ReturnType<typeof useSpeech>;
  voiceCommandToast: string | null;
  setVoiceCommandToast: (msg: string | null) => void;

  // Global Issues State (Live Backend Synced)
  issues: HazardIssue[];
  citizenHistory: HazardIssue[];
  isLoadingIssues: boolean;
  addReportedIssue: (issue: HazardIssue) => Promise<{ wasClustered: boolean }>;
  updateIssueStatus: (
    id: string,
    status: HazardIssue["status"],
    afterPhoto?: string,
    notes?: string
  ) => Promise<void>;
  refreshIssues: () => Promise<void>;

  // Real-Time Notifications
  unreadAlertCount: number;
  clearUnreadAlerts: () => void;
  highPriorityToast: string | null;
  setHighPriorityToast: (msg: string | null) => void;

  // Role Authentication (Citizen vs Ward Officer)
  userRole: "citizen" | "authority";
  setUserRole: (role: "citizen" | "authority") => void;

  // Emergency SOS Toast
  sosActive: boolean;
  triggerSOS: () => void;
  dismissSOS: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Web Audio API chime tone (zero external MP3 dependency)
function playCivicAlertChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    console.warn("Audio chime notice:", err);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>("EN");
  const [issues, setIssues] = useState<HazardIssue[]>(MOCK_ISSUES);
  const [citizenHistory, setCitizenHistory] = useState<HazardIssue[]>(MOCK_CITIZEN_HISTORY);
  const [isLoadingIssues, setIsLoadingIssues] = useState<boolean>(false);
  const [voiceCommandToast, setVoiceCommandToast] = useState<string | null>(null);
  const [sosActive, setSosActive] = useState<boolean>(false);

  // Authority & Real-Time Sync
  const [userRole, setUserRole] = useState<"citizen" | "authority">("citizen");
  const [unreadAlertCount, setUnreadAlertCount] = useState<number>(0);
  const [highPriorityToast, setHighPriorityToast] = useState<string | null>(null);

  const voice = useSpeech();

  const t = (key: string): string => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.EN;
    return langDict[key] || TRANSLATIONS.EN[key] || key;
  };

  // Fetch reports from backend
  const refreshIssues = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.issues)) {
          setIssues((prev) => {
            // Check for newly added high-priority issues (Level 4 or 5)
            const prevIds = new Set(prev.map((i) => i.id));
            const newHighPriority = data.issues.filter(
              (i: HazardIssue) => !prevIds.has(i.id) && i.severity >= 4 && i.status !== "Resolved"
            );

            if (newHighPriority.length > 0 && prev.length > 0) {
              setUnreadAlertCount((c) => c + newHighPriority.length);
              setHighPriorityToast(
                `🚨 Urgent Hazard: ${newHighPriority[0].type} (${newHighPriority[0].location.ward}) reported!`
              );
              playCivicAlertChime();
            }

            return data.issues;
          });
        }
      }
    } catch (e) {
      console.warn("Could not poll backend reports:", e);
    }
  }, []);

  // Poll backend every 6 seconds for multi-device sync
  useEffect(() => {
    refreshIssues();
    const interval = setInterval(refreshIssues, 6000);
    return () => clearInterval(interval);
  }, [refreshIssues]);

  const addReportedIssue = async (newIssue: HazardIssue): Promise<{ wasClustered: boolean }> => {
    // Optimistic local update
    setIssues((prev) => [newIssue, ...prev]);
    setCitizenHistory((prev) => [newIssue, ...prev]);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue: newIssue }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          await refreshIssues();
          return { wasClustered: Boolean(data.wasClustered) };
        }
      }
    } catch (e) {
      console.warn("Report sync to server queued:", e);
    }

    return { wasClustered: false };
  };

  const updateIssueStatus = async (
    id: string,
    status: HazardIssue["status"],
    afterPhoto?: string,
    notes?: string
  ) => {
    // Optimistic local update
    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id === id) {
          return {
            ...issue,
            status,
            afterPhoto: afterPhoto || issue.afterPhoto,
            resolutionNotes: notes || issue.resolutionNotes,
            slaFormatted: status === "Resolved" ? "Completed" : issue.slaFormatted,
          };
        }
        return issue;
      })
    );

    try {
      await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          afterPhoto,
          resolutionNotes: notes,
        }),
      });
      await refreshIssues();
    } catch (e) {
      console.warn("Status patch error:", e);
    }
  };

  const clearUnreadAlerts = () => {
    setUnreadAlertCount(0);
    setHighPriorityToast(null);
  };

  const triggerSOS = () => {
    setSosActive(true);
    voice.speak("Emergency SOS Activated. Dispatching nearest civic patrol units.", language);
  };

  const dismissSOS = () => {
    setSosActive(false);
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        voice,
        voiceCommandToast,
        setVoiceCommandToast,
        issues,
        citizenHistory,
        isLoadingIssues,
        addReportedIssue,
        updateIssueStatus,
        refreshIssues,
        unreadAlertCount,
        clearUnreadAlerts,
        highPriorityToast,
        setHighPriorityToast,
        userRole,
        setUserRole,
        sosActive,
        triggerSOS,
        dismissSOS,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
