"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { TRANSLATIONS } from "@/lib/mockData";
import { openSosSheet, closeSosSheet } from "@/lib/sosEvents";

export type LanguageCode = "EN" | "HI" | "TE";

export interface AppContextType {
  // Language & i18n
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;

  // Toast notification (used for speech fallback when voice is unavailable)
  toast: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;

  // Authority Authentication Gate (passkey GHMC-2026)
  isOfficerAuthenticated: boolean;
  setOfficerAuthenticated: (val: boolean) => void;

  // Emergency SOS trigger (opens local SOS sheet)
  triggerSOS: () => void;
  dismissSOS: () => void;

  // Network Connectivity
  isOnline: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>("EN");
  const [toast, setToast] = useState<string | null>(null);

  // Authority Authentication Gate
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

  // Dynamically synchronize <html lang="..."> attribute with the chosen language
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language.toLowerCase();
    }
  }, [language]);

  const t = useCallback(
    (key: string): string => {
      const langDict = TRANSLATIONS[language] || TRANSLATIONS.EN;
      return langDict[key] || TRANSLATIONS.EN[key] || key;
    },
    [language]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 4500);
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  // Sync document html lang attribute with current language
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang =
        language === "HI" ? "hi" : language === "TE" ? "te" : "en";
    }
  }, [language]);

  const triggerSOS = useCallback(() => {
    openSosSheet();
  }, []);

  const dismissSOS = useCallback(() => {
    closeSosSheet();
  }, []);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        toast,
        showToast,
        clearToast,
        isOfficerAuthenticated,
        setOfficerAuthenticated,
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
