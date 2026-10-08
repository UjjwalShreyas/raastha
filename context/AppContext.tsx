"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
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

  // Global Mock State
  issues: HazardIssue[];
  citizenHistory: HazardIssue[];
  addReportedIssue: (issue: HazardIssue) => void;
  updateIssueStatus: (
    id: string,
    status: HazardIssue["status"],
    afterPhoto?: string,
    notes?: string
  ) => void;

  // Emergency SOS Toast
  sosActive: boolean;
  triggerSOS: () => void;
  dismissSOS: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>("EN");
  const [issues, setIssues] = useState<HazardIssue[]>(MOCK_ISSUES);
  const [citizenHistory, setCitizenHistory] = useState<HazardIssue[]>(MOCK_CITIZEN_HISTORY);
  const [voiceCommandToast, setVoiceCommandToast] = useState<string | null>(null);
  const [sosActive, setSosActive] = useState<boolean>(false);

  const voice = useSpeech();

  const t = (key: string): string => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.EN;
    return langDict[key] || TRANSLATIONS.EN[key] || key;
  };

  const addReportedIssue = (newIssue: HazardIssue) => {
    setIssues((prev) => [newIssue, ...prev]);
    setCitizenHistory((prev) => [newIssue, ...prev]);
  };

  const updateIssueStatus = (
    id: string,
    status: HazardIssue["status"],
    afterPhoto?: string,
    notes?: string
  ) => {
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

    setCitizenHistory((prev) =>
      prev.map((issue) => {
        if (issue.id === id) {
          return {
            ...issue,
            status,
            afterPhoto: afterPhoto || issue.afterPhoto,
            resolutionNotes: notes || issue.resolutionNotes,
          };
        }
        return issue;
      })
    );
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
        addReportedIssue,
        updateIssueStatus,
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
