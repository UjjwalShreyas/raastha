"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Camera,
  Navigation,
  FileText,
  ArrowRight,
  Keyboard,
  Send,
  MapPin,
  Zap,
  Eye,
  Radio,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useLocation } from "@/context/LocationContext";
import { useRecognition, speak } from "@/hooks/useSpeech";
import { parseVoiceIntent } from "@/lib/intents";
import { openSosSheet } from "@/lib/sosEvents";
import { useRouter } from "next/navigation";
import { processVoiceWithGemini } from "@/lib/ai/voiceAssistant";
export default function Home() {
  const router = useRouter();
  const { language, t, showToast } = useApp();
  const { error: locationError } = useLocation();
  const [typedInput, setTypedInput] = useState<string>("");
  const [isTypingFallbackOpen, setIsTypingFallbackOpen] = useState<boolean>(false);
  const [transcriptText, setTranscriptText] = useState<string>("");

  const handleExecuteIntent = async (rawText: string) => {
    // 1. Process voice command and evaluate severity with Gemini AI
    const analysis = await processVoiceWithGemini(rawText, language);
    const spokenReply = analysis.replyLocal;

    if (analysis.intent === "report") {
      const msg = spokenReply || t("voiceOpeningReport");
      const ok = speak(msg, language);
      if (!ok) showToast(msg);
      
      const queryParams = new URLSearchParams();
      if (analysis.issueType) queryParams.set("type", analysis.issueType);
      if (analysis.severity) queryParams.set("severity", analysis.severity);
      if (rawText.trim().length > 10) queryParams.set("desc", rawText.trim());
      
      const targetUrl = queryParams.toString() ? `/report?${queryParams.toString()}` : "/report";
      setTimeout(() => router.push(targetUrl), 400);
    } else if (analysis.intent === "route") {
      const msg = spokenReply || t("voiceOpeningRoute");
      const ok = speak(msg, language);
      if (!ok) showToast(msg);
      
      const targetUrl = analysis.destination
        ? `/route?dest=${encodeURIComponent(analysis.destination)}`
        : "/route";
      setTimeout(() => router.push(targetUrl), 400);
    } else if (analysis.intent === "my_reports") {
      const msg = spokenReply || t("voiceOpeningMyReports");
      const ok = speak(msg, language);
      if (!ok) showToast(msg);
      setTimeout(() => router.push("/my-reports"), 400);
    } else if (analysis.intent === "sos") {
      const msg = spokenReply || t("voiceOpeningSOS");
      const ok = speak(msg, language);
      if (!ok) showToast(msg);
      openSosSheet();
    } else {
      const msg = spokenReply || t("voiceUnknownCommand");
      showToast(msg);
    }
  };

  const recognition = useRecognition(language, {
    onFinal: (text) => {
      setTranscriptText(text);
      handleExecuteIntent(text);
    },
    onInterim: (text) => {
      setTranscriptText(text);
    },
  });

  const handleVoiceToggle = () => {
    if (recognition.listening) {
      recognition.stop();
    } else {
      setTranscriptText("");
      recognition.start();
    }
  };

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    handleExecuteIntent(typedInput.trim());
    setTypedInput("");
    setIsTypingFallbackOpen(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6"
    >


      {/* ── Hero Section ── */}
      <motion.div variants={itemVariants} className="text-center space-y-5 py-2 relative">
        {/* Decorative Elements */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#3E000C]/[0.03] rounded-full blur-3xl pointer-events-none" />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-card text-[11px] font-semibold text-[#3E000C]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>AI-Powered Civic Safety Platform</span>
          <Zap className="w-3 h-3 text-amber-500" />
        </motion.div>

        {/* Title */}
        <div className="relative">
          <h1
            className="text-4xl sm:text-5xl font-black tracking-tight gradient-text leading-[1.1]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            {t("appName")}
          </h1>
          <p className="text-sm sm:text-base text-[#3E000C]/60 font-normal mt-2.5 max-w-md mx-auto leading-relaxed">
            {t("tagline")}
          </p>
        </div>

        {/* ── Voice Control Centerpiece ── */}
        <div className="flex flex-col items-center justify-center pt-4 relative">
          {/* Outer glow rings */}
          <div className="relative">
            {recognition.listening && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.6 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/20 to-rose-600/20"
                />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0.4 }}
                  animate={{ scale: 1.4, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.3 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/15 to-rose-600/15"
                />
              </>
            )}

            <motion.button
              type="button"
              onClick={handleVoiceToggle}
              disabled={recognition.isProcessing}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
                recognition.listening
                  ? "bg-gradient-to-br from-red-600 to-rose-700 text-white ring-4 ring-red-300/50 shadow-[0_0_40px_rgba(225,29,72,0.3)]"
                  : recognition.isProcessing
                  ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white ring-4 ring-amber-300/50 shadow-[0_0_40px_rgba(217,119,6,0.3)] animate-pulse"
                  : "bg-gradient-to-br from-[#3E000C] to-[#5C1020] text-[#FFECD1] shadow-[0_8px_32px_rgba(62,0,12,0.25)] hover:shadow-[0_12px_48px_rgba(62,0,12,0.35)]"
              }`}
            >
              <Mic className={`w-10 h-10 sm:w-11 sm:h-11 ${recognition.listening || recognition.isProcessing ? "animate-pulse" : ""}`} />
              <span className="text-[10px] font-bold mt-1.5 tracking-wider uppercase opacity-80">
                {recognition.listening
                  ? "Listening..."
                  : recognition.isProcessing
                  ? "Vosk Processing..."
                  : "Tap to Speak"}
              </span>
            </motion.button>
          </div>

          {/* Status text & transcript */}
          <div className="mt-4 text-center space-y-2.5 w-full max-w-sm">
            <AnimatePresence mode="wait">
              {recognition.isProcessing ? (
                <motion.p
                  key="processing"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-xs text-amber-900 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl font-medium"
                >
                  ⚡ Converting speech to text with offline Vosk model...
                </motion.p>
              ) : transcriptText ? (
                <motion.p
                  key="transcript"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-xs text-[#3E000C]/80 glass-card px-4 py-2 rounded-xl font-medium"
                >
                  &ldquo;{transcriptText}&rdquo;
                </motion.p>
              ) : null}
            </AnimatePresence>
            {recognition.error && (
              <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium">
                {recognition.error}
              </p>
            )}
            {locationError && (
              <p className="text-[11px] text-[#3E000C]/65 glass-card px-3 py-1.5 rounded-xl font-medium">
                {t("gpsDenied")}
              </p>
            )}
          </div>

          {/* Typed Fallback */}
          <div className="pt-3">
            <button
              type="button"
              onClick={() => setIsTypingFallbackOpen(!isTypingFallbackOpen)}
              className="text-[11px] font-medium text-[#3E000C]/50 hover:text-[#3E000C]/80 cursor-pointer flex items-center gap-1.5 mx-auto transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>{isTypingFallbackOpen ? "Hide text input" : "Prefer typing?"}</span>
            </button>

            <AnimatePresence>
              {isTypingFallbackOpen && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleTypedSubmit}
                  className="flex gap-2 mt-2.5 max-w-sm mx-auto"
                >
                  <input
                    type="text"
                    value={typedInput}
                    onChange={(e) => setTypedInput(e.target.value)}
                    placeholder="Type: report, route, sos..."
                    className="flex-1 glass-card rounded-xl px-4 py-2 text-xs text-[#3E000C] focus:outline-none focus:ring-2 focus:ring-[#3E000C]/20 placeholder:text-[#3E000C]/35"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-[#3E000C] text-[#FFECD1] rounded-xl text-xs font-bold cursor-pointer shadow-sm hover:shadow-md transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>



      {/* ── Three Feature Cards ── */}
      <motion.div variants={itemVariants} className="space-y-3">
        {/* 1. Report a Hazard */}
        <Link href="/report" className="block group">
          <motion.div
            whileHover={{ y: -3, scale: 1.005 }}
            whileTap={{ scale: 0.99 }}
            className="p-5 rounded-3xl glass-dark text-[#FFECD1] flex items-center justify-between cursor-pointer relative overflow-hidden"
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFECD1]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#FFECD1]/20 to-[#FFECD1]/5 flex items-center justify-center shrink-0 border border-[#FFECD1]/15 shadow-inner">
                <Camera className="w-6 h-6 text-[#FFECD1]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  {t("reportProblem")}
                </h2>
                <p className="text-xs text-[#FFECD1]/60 font-normal mt-0.5">
                  {t("reportProblemSub")}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#FFECD1]/60 shrink-0 group-hover:translate-x-1 transition-transform relative z-10" />
          </motion.div>
        </Link>

        {/* 2. Safe Route */}
        <Link href="/route" className="block group">
          <motion.div
            whileHover={{ y: -3, scale: 1.005 }}
            whileTap={{ scale: 0.99 }}
            className="p-5 rounded-3xl glass-card-elevated text-[#3E000C] flex items-center justify-between cursor-pointer relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3E000C]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#3E000C]/10 to-[#3E000C]/5 flex items-center justify-center shrink-0 border border-[#3E000C]/10">
                <Navigation className="w-6 h-6 text-[#3E000C]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  {t("safeRoute")}
                </h2>
                <p className="text-xs text-[#3E000C]/55 font-normal mt-0.5">
                  {t("safeRouteSub")}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#3E000C]/40 shrink-0 group-hover:translate-x-1 transition-transform relative z-10" />
          </motion.div>
        </Link>

        {/* 3. My Reports */}
        <Link href="/my-reports" className="block group">
          <motion.div
            whileHover={{ y: -3, scale: 1.005 }}
            whileTap={{ scale: 0.99 }}
            className="p-5 rounded-3xl glass-card-elevated text-[#3E000C] flex items-center justify-between cursor-pointer relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3E000C]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#3E000C]/10 to-[#3E000C]/5 flex items-center justify-center shrink-0 border border-[#3E000C]/10">
                <FileText className="w-6 h-6 text-[#3E000C]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  {t("myReports")}
                </h2>
                <p className="text-xs text-[#3E000C]/55 font-normal mt-0.5">
                  {t("myReportsSub")}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#3E000C]/40 shrink-0 group-hover:translate-x-1 transition-transform relative z-10" />
          </motion.div>
        </Link>
      </motion.div>

      {/* ── How It Works Mini Section ── */}
      <motion.div variants={itemVariants} className="pt-2">
        <div className="section-divider mb-6" />
        <div className="text-center mb-5">
          <h3
            className="text-lg font-bold text-[#3E000C] tracking-tight"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            How Raastha Works
          </h3>
          <p className="text-xs text-[#3E000C]/50 mt-1">Three steps to safer streets</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: "01", title: "Spot & Snap", desc: "Photo a hazard with AI analysis", icon: Eye },
            { step: "02", title: "Auto-Dispatch", desc: "Routed to nearest authority", icon: Radio },
            { step: "03", title: "Track Fix", desc: "Before & after verification", icon: MapPin },
          ].map((item, idx) => (
            <motion.div
              key={item.step}
              whileHover={{ y: -2 }}
              className="glass-card rounded-2xl p-4 text-center space-y-2.5 cursor-default"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3E000C]/10 to-[#3E000C]/5 flex items-center justify-center mx-auto border border-[#3E000C]/8">
                <item.icon className="w-4.5 h-4.5 text-[#3E000C]/70" />
              </div>
              <div
                className="text-[10px] font-bold text-[#3E000C]/35 uppercase tracking-widest"
                style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
              >
                Step {item.step}
              </div>
              <div className="text-xs font-bold text-[#3E000C]">{item.title}</div>
              <div className="text-[10px] text-[#3E000C]/50 leading-relaxed">{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Footer Credit ── */}
      <motion.div variants={itemVariants} className="text-center py-4">
        <div className="section-divider mb-4" />
        <p className="text-[10px] text-[#3E000C]/30 font-medium">
          Built with Gemini AI • Protecting communities, one report at a time
        </p>
      </motion.div>
    </motion.div>
  );
}
