"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mic,
  Camera,
  Navigation,
  FileText,
  ShieldAlert,
  ArrowRight,
  Globe,
  Keyboard,
  Send,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function Home() {
  const { language, setLanguage, voice, triggerSOS, t, locationError } = useApp();
  const [typedInput, setTypedInput] = useState<string>(" ");
  const [isTypingFallbackOpen, setIsTypingFallbackOpen] = useState<boolean>(false);

  const handleVoiceToggle = () => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening(language);
    }
  };

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    voice.speak(`Received instruction: ${typedInput}`, language);
    setTypedInput("");
    setIsTypingFallbackOpen(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-8 font-sans">
      {/* Top Utility Bar: Language Switcher & Emergency SOS */}
      <div className="flex items-center justify-between bg-white/70 backdrop-blur-xs p-2.5 rounded-2xl border border-[#3E000C]/12 shadow-2xs">
        {/* Language Switch */}
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-[#3E000C]/60 ml-2" />
          {(["EN", "HI", "TE"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                language === lang
                  ? "bg-[#3E000C] text-[#FFECD1] shadow-2xs"
                  : "text-[#3E000C]/70 hover:bg-[#3E000C]/8"
              }`}
            >
              {lang === "EN" ? "English" : lang === "HI" ? "हिंदी" : "తెలుగు"}
            </button>
          ))}
        </div>

        {/* Instant SOS Button */}
        <button
          onClick={triggerSOS}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>SOS</span>
        </button>
      </div>

      {/* Hero Voice Centerpiece */}
      <div className="text-center space-y-5 py-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#3E000C] tracking-tight">
            {t("appName")}
          </h1>
          <p className="text-xs sm:text-sm text-[#3E000C]/70 font-normal mt-1">
            {t("tagline")}
          </p>
        </div>

        {/* Big Interactive Microphone Button */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="relative">
            {voice.isListening && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 1.35, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-[#3E000C]/25"
              />
            )}

            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                voice.isListening
                  ? "bg-red-700 text-white ring-4 ring-red-300 scale-105"
                  : "bg-[#3E000C] text-[#FFECD1] hover:scale-102 hover:shadow-2xl"
              }`}
            >
              <Mic className={`w-10 h-10 ${voice.isListening ? "animate-pulse" : ""}`} />
            </button>
          </div>

          <div className="mt-3 text-center space-y-2">
            <span className="text-xs font-bold text-[#3E000C]">
              {voice.isListening ? t("listening") : t("speakNow")}
            </span>
            {voice.transcript && (
              <p className="text-xs text-[#3E000C]/80 bg-white/80 border border-[#3E000C]/12 px-3 py-1.5 rounded-xl max-w-sm mx-auto font-medium">
                "{voice.transcript}"
              </p>
            )}
            {voice.speechNotice && (
              <p className="text-[11px] text-amber-900 bg-amber-100/90 border border-amber-300 px-3 py-1.5 rounded-xl max-w-sm mx-auto font-medium">
                {t("micDenied")}
              </p>
            )}
            {locationError && (
              <p className="text-[11px] text-[#3E000C]/75 bg-white/60 border border-[#3E000C]/12 px-3 py-1 rounded-xl max-w-sm mx-auto font-medium">
                {t("gpsDenied")}
              </p>
            )}
          </div>

          {/* Visible Typed Fallback toggle (for browsers/devices without speech recognition) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsTypingFallbackOpen(!isTypingFallbackOpen)}
              className="text-[11px] font-semibold text-[#3E000C]/65 hover:text-[#3E000C] underline cursor-pointer flex items-center gap-1 mx-auto"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>{isTypingFallbackOpen ? "Hide Text Input" : "Prefer typing? Use text fallback"}</span>
            </button>

            {isTypingFallbackOpen && (
              <form onSubmit={handleTypedSubmit} className="flex gap-2 mt-2 max-w-sm mx-auto">
                <input
                  type="text"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  placeholder="Type hazard or destination..."
                  className="flex-1 bg-white border border-[#3E000C]/20 rounded-xl px-3 py-1.5 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#3E000C] text-[#FFECD1] rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Exactly Three Big Buttons (As Requested) */}
      <div className="space-y-3.5 pt-2">
        {/* 1. Report a Problem */}
        <Link href="/report" className="block">
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="p-5 rounded-3xl bg-[#3E000C] text-[#FFECD1] flex items-center justify-between shadow-md hover:shadow-lg transition-all border border-[#3E000C] cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FFECD1]/15 flex items-center justify-center shrink-0 border border-[#FFECD1]/20">
                <Camera className="w-6 h-6 text-[#FFECD1]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  {t("reportProblem")}
                </h2>
                <p className="text-xs text-[#FFECD1]/75 font-normal">
                  {t("reportProblemSub")}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#FFECD1]/80 shrink-0" />
          </motion.div>
        </Link>

        {/* 2. Safe Route Navigation */}
        <Link href="/route" className="block">
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="p-5 rounded-3xl bg-white text-[#3E000C] flex items-center justify-between shadow-xs hover:shadow-md transition-all border border-[#3E000C]/15 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#3E000C]/8 flex items-center justify-center shrink-0 border border-[#3E000C]/12">
                <Navigation className="w-6 h-6 text-[#3E000C]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  {t("safeRoute")}
                </h2>
                <p className="text-xs text-[#3E000C]/70 font-normal">
                  {t("safeRouteSub")}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#3E000C]/60 shrink-0" />
          </motion.div>
        </Link>

        {/* 3. My Reports & Fix Tracker */}
        <Link href="/my-reports" className="block">
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="p-5 rounded-3xl bg-white text-[#3E000C] flex items-center justify-between shadow-xs hover:shadow-md transition-all border border-[#3E000C]/15 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#3E000C]/8 flex items-center justify-center shrink-0 border border-[#3E000C]/12">
                <FileText className="w-6 h-6 text-[#3E000C]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  {t("myReports")}
                </h2>
                <p className="text-xs text-[#3E000C]/70 font-normal">
                  {t("myReportsSub")}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#3E000C]/60 shrink-0" />
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
