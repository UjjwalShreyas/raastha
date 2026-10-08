"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { TRANSLATIONS } from "@/lib/mockData";
import { useSpeech } from "@/hooks/useSpeech";

export type LanguageCode = "EN" | "HI" | "TE";

export interface AppContextType {
  // Language & i18n
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;

  // Voice & Mode State
  voice: ReturnType<typeof useSpeech>;
  voiceMode: "command" | "dictation";
  setVoiceMode: (mode: "command" | "dictation") => void;
  voiceCommandToast: string | null;
  setVoiceCommandToast: (msg: string | null) => void;

  // Authority Authentication Gate (passkey GHMC-2026)
  isOfficerAuthenticated: boolean;
  setOfficerAuthenticated: (val: boolean) => void;

  // Emergency SOS State
  sosActive: boolean;
  triggerSOS: () => void;
  dismissSOS: () => void;

  // Network Connectivity
  isOnline: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>("EN");
  const [voiceCommandToast, setVoiceCommandToast] = useState<string | null>(null);
  const [sosActive, setSosActive] = useState<boolean>(false);

  // Voice Modes: 'command' (VoiceBar) vs 'dictation' (forms)
  const [voiceMode, setVoiceMode] = useState<"command" | "dictation">("command");

  // Authority Authentication Gate (passkey GHMC-2026)
  const [isOfficerAuthenticated, setOfficerAuthenticated] = useState<boolean>(false);

  // Network Connectivity State
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const voice = useSpeech();

  const t = useCallback(
    (key: string): string => {
      const langDict = TRANSLATIONS[language] || TRANSLATIONS.EN;
      return langDict[key] || TRANSLATIONS.EN[key] || key;
    },
    [language]
  );

  // Sync document html lang attribute with current language
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language === "HI" ? "hi" : language === "TE" ? "te" : "en";
    }
  }, [language]);

  const triggerSOS = () => {
    setSosActive(true);
    voice.speak(t("sosActivated"), language);
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
        voiceMode,
        setVoiceMode,
        voiceCommandToast,
        setVoiceCommandToast,
        isOfficerAuthenticated,
        setOfficerAuthenticated,
        sosActive,
        triggerSOS,
        dismissSOS,
        isOnline,
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
