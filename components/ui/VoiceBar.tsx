"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Sparkles, Navigation, AlertTriangle, ShieldCheck, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";

export function VoiceBar() {
  const { voice, voiceMode, language, t, triggerSOS } = useApp();
  const { isListening, transcript, setTranscript, supported, startListening, stopListening, speak, speechNotice } = voice;
  const router = useRouter();
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    // CRITICAL FIX: If user is inside a form dictating (voiceMode === "dictation"),
    // IGNORE VoiceBar keyword navigation completely! Do NOT navigate away or trigger SOS!
    if (voiceMode === "dictation") return;

    if (!transcript) return;

    const lower = transcript.toLowerCase();

    // Intent: Report Hazard
    if (
      lower.includes("report hazard") ||
      lower.includes("report pothole") ||
      lower.includes("report issue") ||
      lower.includes("शिकायत दर्ज") ||
      lower.includes("गड्ढे की शिकायत") ||
      lower.includes("ఫిర్యాదు చేయండి") ||
      lower.includes("సమస్యను నివేదించండి")
    ) {
      setLastActionFeedback("Opening Hazard Report wizard...");
      speak("Opening hazard report wizard", language);
      setTimeout(() => {
        stopListening();
        setTranscript("");
        router.push("/report");
      }, 900);
    }
    // Intent: Safe Route
    else if (
      lower.includes("safe route") ||
      lower.includes("safe corridor") ||
      lower.includes("find route") ||
      lower.includes("सुरक्षित मार्ग") ||
      lower.includes("సురక్షిత మార్గం")
    ) {
      setLastActionFeedback("Opening Safe Corridor Navigation...");
      speak("Finding safest route corridor", language);
      setTimeout(() => {
        stopListening();
        setTranscript("");
        router.push("/route");
      }, 900);
    }
    // Intent: Emergency SOS (Strict confirmation required, NEVER loose 'help' keyword)
    else if (
      lower.includes("emergency sos confirm") ||
      lower.includes("trigger sos confirm") ||
      lower.includes("आपातकालीन एसओएस") ||
      lower.includes("అత్యవసర ఎస్ఓఎస్")
    ) {
      setLastActionFeedback("Emergency SOS broadcast activated!");
      triggerSOS();
      stopListening();
    }
  }, [transcript, voiceMode, router, speak, language, stopListening, setTranscript, triggerSOS]);

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(language);
    }
  };

  return (
    <div className="fixed bottom-6 inset-x-0 z-50 flex flex-col items-center pointer-events-none px-4 font-sans">
      {/* Speech notice / feedback card */}
      <AnimatePresence>
        {(isListening || transcript || lastActionFeedback || speechNotice) && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-auto mb-3 max-w-sm w-full bg-[#3E000C]/95 backdrop-blur-2xl border border-[#FFECD1]/25 text-[#FFECD1] rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2"
          >
            <div className="flex items-center justify-between text-[11px] text-[#FFECD1]/70">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFECD1] animate-pulse" />
                {voiceMode === "dictation"
                  ? "Form Dictation Mode"
                  : isListening
                  ? t("listening")
                  : "Voice Assistant"}
              </span>
              <button
                onClick={() => {
                  stopListening();
                  setTranscript("");
                  setLastActionFeedback(null);
                }}
                className="text-[#FFECD1]/50 hover:text-[#FFECD1] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs font-semibold text-[#FFECD1]">
              {speechNotice || lastActionFeedback || transcript || t("speakNow")}
            </p>

            {/* Soundwave Animation */}
            {isListening && (
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

      {/* Floating Mic Pill */}
      <div className="pointer-events-auto flex items-center gap-2 bg-[#3E000C] border border-[#FFECD1]/25 rounded-full p-1.5 shadow-2xl">
        <button
          onClick={toggleMic}
          aria-label="Voice Navigation Assistant"
          className={`relative flex items-center justify-center w-11 h-11 rounded-full text-[#FFECD1] transition-all cursor-pointer ${
            isListening
              ? "bg-red-600 ring-2 ring-red-300 scale-105"
              : "bg-[#FFECD1]/15 hover:bg-[#FFECD1]/25"
          }`}
        >
          {isListening ? (
            <Mic className="w-5 h-5 animate-pulse text-white" />
          ) : (
            <Mic className="w-5 h-5 text-[#FFECD1]" />
          )}
        </button>

        <span className="text-xs font-bold text-[#FFECD1] pr-3 select-none">
          {isListening ? "Listening..." : "Voice Nav"}
        </span>
      </div>
    </div>
  );
}
