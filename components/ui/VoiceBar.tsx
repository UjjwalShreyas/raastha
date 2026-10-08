"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Navigation,
  AlertTriangle,
  Send,
  X,
  Keyboard,
  Compass,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { useRecognition, speak } from "@/hooks/useSpeech";
import { parseVoiceIntent } from "@/lib/intents";
import { openSosSheet } from "@/lib/sosEvents";

export function VoiceBar() {
  const { language, t, showToast } = useApp();
  const router = useRouter();

  const [feedback, setFeedback] = useState<string | null>(null);
  const [typedInput, setTypedInput] = useState<string>("");
  const [showTypedInput, setShowTypedInput] = useState<boolean>(false);

  // Dispatch intent action with safety
  const executeIntent = useCallback(
    (rawText: string) => {
      const intent = parseVoiceIntent(rawText);

      if (intent === "report") {
        const msg = t("voiceOpeningReport");
        setFeedback(msg);
        const spoke = speak(msg, language);
        if (!spoke) showToast(msg);
        setTimeout(() => {
          setFeedback(null);
          router.push("/report");
        }, 600);
      } else if (intent === "route") {
        const msg = t("voiceOpeningRoute");
        setFeedback(msg);
        const spoke = speak(msg, language);
        if (!spoke) showToast(msg);
        setTimeout(() => {
          setFeedback(null);
          router.push("/route");
        }, 600);
      } else if (intent === "my_reports") {
        const msg = t("voiceOpeningMyReports");
        setFeedback(msg);
        const spoke = speak(msg, language);
        if (!spoke) showToast(msg);
        setTimeout(() => {
          setFeedback(null);
          router.push("/my-reports");
        }, 600);
      } else if (intent === "sos") {
        const msg = t("voiceOpeningSOS");
        setFeedback(msg);
        const spoke = speak(msg, language);
        if (!spoke) showToast(msg);
        // Safety: only opens local SOS sheet; NEVER sends or broadcasts
        openSosSheet();
        setTimeout(() => {
          setFeedback(null);
        }, 1200);
      } else {
        const msg = t("voiceUnknownCommand");
        setFeedback(msg);
        showToast(msg);
        setTimeout(() => {
          setFeedback(null);
        }, 3000);
      }
    },
    [language, router, showToast, t]
  );

  // Component owns its own recognizer: command mode only
  const { start, stop, listening, supported, error } = useRecognition(language, {
    onFinal: (text) => {
      setFeedback(`"${text}"`);
      executeIntent(text);
      stop();
    },
    onInterim: (text) => {
      setFeedback(`"${text}"...`);
    },
  });

  const toggleMic = () => {
    if (listening) {
      stop();
      setFeedback(null);
    } else {
      setFeedback(t("listening"));
      start();
    }
  };

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    executeIntent(typedInput.trim());
    setTypedInput("");
    setShowTypedInput(false);
  };

  // If speech is completely unsupported, keep typed fallback input always visible
  const isInputAlwaysVisible = !supported;

  return (
    <div className="fixed bottom-6 inset-x-0 z-50 flex flex-col items-center pointer-events-none px-4 font-sans">
      {/* Visual Feedback / Error / Transcript Card */}
      <AnimatePresence>
        {(listening || feedback || error) && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-auto mb-3 max-w-sm w-full bg-[#3E000C]/95 backdrop-blur-2xl border border-[#FFECD1]/25 text-[#FFECD1] rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2"
          >
            <div className="flex items-center justify-between text-[11px] text-[#FFECD1]/70">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFECD1] animate-pulse" />
                {listening ? t("listening") : "Voice Command Assistant"}
              </span>
              <button
                type="button"
                onClick={() => {
                  stop();
                  setFeedback(null);
                }}
                className="text-[#FFECD1]/50 hover:text-[#FFECD1] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs font-semibold text-[#FFECD1]">
              {error || feedback || t("speakNow")}
            </p>

            {/* Soundwave animation */}
            {listening && (
              <div className="flex items-center justify-center gap-1 h-3 pt-0.5">
                {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7, 0.3].map((scaleVal, idx) => (
                  <motion.div
                    key={idx}
                    animate={{ scaleY: [0.3, scaleVal * 1.5, 0.3] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.6 + idx * 0.08,
                      ease: "easeInOut",
                    }}
                    className="w-1 h-full bg-[#FFECD1] rounded-full"
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typed Command Fallback Form */}
      <AnimatePresence>
        {(isInputAlwaysVisible || showTypedInput) && (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onSubmit={handleTypedSubmit}
            className="pointer-events-auto mb-2.5 max-w-sm w-full flex items-center gap-1.5 bg-[#3E000C] border border-[#FFECD1]/25 p-1.5 rounded-2xl shadow-xl"
          >
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder="Type command: 'report', 'route', 'sos'..."
              className="flex-1 bg-[#FFECD1]/10 text-xs text-[#FFECD1] placeholder:text-[#FFECD1]/50 px-3 py-1.5 rounded-xl focus:outline-none"
            />
            <button
              type="submit"
              className="p-2 bg-[#FFECD1] text-[#3E000C] rounded-xl font-bold cursor-pointer hover:opacity-90"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            {!isInputAlwaysVisible && (
              <button
                type="button"
                onClick={() => setShowTypedInput(false)}
                className="p-1.5 text-[#FFECD1]/60 hover:text-[#FFECD1] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      {/* Floating Pill Controls */}
      <div className="pointer-events-auto flex items-center gap-2 bg-[#3E000C] border border-[#FFECD1]/25 rounded-full p-1.5 shadow-2xl">
        <button
          type="button"
          onClick={toggleMic}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
            listening
              ? "bg-red-600 text-white animate-pulse"
              : "bg-[#FFECD1] text-[#3E000C] hover:opacity-90"
          }`}
          title="Command Mic"
        >
          {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>{listening ? t("listening") : t("voiceCommandBtn")}</span>
        </button>

        {/* Typed command toggle button if speech is supported */}
        {supported && (
          <button
            type="button"
            onClick={() => setShowTypedInput((prev) => !prev)}
            className="p-2 rounded-full text-[#FFECD1]/80 hover:text-[#FFECD1] hover:bg-[#FFECD1]/10 transition-colors cursor-pointer"
            title="Type a command"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
