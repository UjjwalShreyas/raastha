"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Send,
  X,
  Keyboard,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { useRecognition, speak } from "@/hooks/useSpeech";
import { parseVoiceIntent } from "@/lib/intents";
import { openSosSheet } from "@/lib/sosEvents";
import { processVoiceWithGemini } from "@/lib/ai/voiceAssistant";

export function VoiceBar() {
  const { language, t, showToast } = useApp();
  const router = useRouter();

  const [feedback, setFeedback] = useState<string | null>(null);
  const [typedInput, setTypedInput] = useState<string>("");
  const [showTypedInput, setShowTypedInput] = useState<boolean>(false);

  const executeIntent = useCallback(
    async (rawText: string) => {
      // Analyze with Gemini AI
      const analysis = await processVoiceWithGemini(rawText, language);
      const spokenReply = analysis.replyLocal;

      if (analysis.intent === "report") {
        const msg = spokenReply || t("voiceOpeningReport");
        setFeedback(msg);
        const spoke = speak(msg, language);
        if (!spoke) showToast(msg);

        const queryParams = new URLSearchParams();
        if (analysis.issueType) queryParams.set("type", analysis.issueType);
        if (analysis.severity) queryParams.set("severity", analysis.severity);
        if (rawText.trim().length > 10) queryParams.set("desc", rawText.trim());

        const targetUrl = queryParams.toString() ? `/report?${queryParams.toString()}` : "/report";
        setTimeout(() => {
          setFeedback(null);
          router.push(targetUrl);
        }, 500);
      } else if (analysis.intent === "route") {
        const msg = spokenReply || t("voiceOpeningRoute");
        setFeedback(msg);
        const spoke = speak(msg, language);
        if (!spoke) showToast(msg);

        const targetUrl = analysis.destination
          ? `/route?dest=${encodeURIComponent(analysis.destination)}`
          : "/route";
        setTimeout(() => {
          setFeedback(null);
          router.push(targetUrl);
        }, 500);
      } else if (analysis.intent === "my_reports") {
        const msg = spokenReply || t("voiceOpeningMyReports");
        setFeedback(msg);
        const spoke = speak(msg, language);
        if (!spoke) showToast(msg);
        setTimeout(() => {
          setFeedback(null);
          router.push("/my-reports");
        }, 500);
      } else if (analysis.intent === "sos") {
        const msg = spokenReply || t("voiceOpeningSOS");
        setFeedback(msg);
        const spoke = speak(msg, language);
        if (!spoke) showToast(msg);
        openSosSheet();
        setTimeout(() => {
          setFeedback(null);
        }, 1200);
      } else {
        const msg = spokenReply || t("voiceUnknownCommand");
        setFeedback(msg);
        showToast(msg);
        setTimeout(() => {
          setFeedback(null);
        }, 3000);
      }
    },
    [language, router, showToast, t]
  );

  const { start, stop, listening, isProcessing, supported, error } = useRecognition(language, {
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

  const isInputAlwaysVisible = !supported;

  return (
    <div className="fixed bottom-5 inset-x-0 z-50 flex flex-col items-center pointer-events-none px-4">
      {/* Feedback / Transcript Card */}
      <AnimatePresence>
        {(listening || isProcessing || feedback || error) && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto mb-3 max-w-sm w-full glass-dark rounded-2xl p-4 space-y-2.5"
          >
            <div className="flex items-center justify-between text-[11px] text-[#FFECD1]/60">
              <span className="flex items-center gap-1.5 font-bold">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isProcessing ? "bg-amber-400" : "bg-emerald-400"
                  } animate-pulse`}
                />
                {isProcessing
                  ? "Vosk AI Transcribing..."
                  : listening
                  ? t("listening")
                  : "Voice Assistant"}
              </span>
              <button
                type="button"
                onClick={() => {
                  stop();
                  setFeedback(null);
                }}
                className="text-[#FFECD1]/40 hover:text-[#FFECD1] cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs font-semibold text-[#FFECD1]">
              {isProcessing
                ? "⚡ Converting speech to text with offline Vosk model..."
                : error || feedback || t("speakNow")}
            </p>

            {/* Waveform */}
            {listening && (
              <div className="flex items-center justify-center gap-[3px] h-4 pt-1">
                {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7, 0.3, 0.6, 0.9].map((scaleVal, idx) => (
                  <motion.div
                    key={idx}
                    animate={{ scaleY: [0.25, scaleVal * 1.4, 0.25] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.55 + idx * 0.06,
                      ease: "easeInOut",
                    }}
                    className="w-[3px] h-full bg-gradient-to-t from-[#FFECD1]/60 to-[#FFECD1] rounded-full"
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typed Command Input */}
      <AnimatePresence>
        {(isInputAlwaysVisible || showTypedInput) && (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onSubmit={handleTypedSubmit}
            className="pointer-events-auto mb-2.5 max-w-sm w-full flex items-center gap-1.5 glass-dark p-1.5 rounded-2xl"
          >
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder="Type: 'report', 'route', 'sos'..."
              className="flex-1 bg-[#FFECD1]/8 text-xs text-[#FFECD1] placeholder:text-[#FFECD1]/35 px-3.5 py-2 rounded-xl focus:outline-none focus:bg-[#FFECD1]/12 transition-colors"
            />
            <button
              type="submit"
              className="p-2 bg-[#FFECD1] text-[#3E000C] rounded-xl font-bold cursor-pointer hover:bg-[#FFECD1]/90 transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            {!isInputAlwaysVisible && (
              <button
                type="button"
                onClick={() => setShowTypedInput(false)}
                className="p-1.5 text-[#FFECD1]/40 hover:text-[#FFECD1] cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      {/* Floating Pill */}
      <div className="pointer-events-auto flex items-center gap-2 glass-dark rounded-full p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
        <motion.button
          type="button"
          onClick={toggleMic}
          disabled={isProcessing}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all cursor-pointer ${
            listening
              ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)] animate-pulse"
              : isProcessing
              ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-[0_0_20px_rgba(217,119,6,0.3)] animate-pulse"
              : "bg-[#FFECD1] text-[#3E000C] hover:bg-[#FFECD1]/90 shadow-sm"
          }`}
          title="Vosk Voice Command Mic"
        >
          {listening ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className={`w-4 h-4 ${isProcessing ? "animate-pulse" : ""}`} />
          )}
          <span>
            {listening
              ? t("listening")
              : isProcessing
              ? "Vosk STT..."
              : t("voiceCommandBtn")}
          </span>
        </motion.button>

        {supported && (
          <button
            type="button"
            onClick={() => setShowTypedInput((prev) => !prev)}
            className="p-2 rounded-full text-[#FFECD1]/50 hover:text-[#FFECD1] hover:bg-[#FFECD1]/10 transition-all cursor-pointer"
            title="Type a command"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
