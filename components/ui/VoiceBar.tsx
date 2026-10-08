"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Sparkles, Navigation, AlertTriangle, ShieldCheck, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";

export function VoiceBar() {
  const { voice, language, t, triggerSOS } = useApp();
  const { isListening, transcript, setTranscript, supported, startListening, stopListening, speak } = voice;
  const router = useRouter();
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!transcript) return;

    const lower = transcript.toLowerCase();

    if (
      lower.includes("report") ||
      lower.includes("pothole") ||
      lower.includes("light") ||
      lower.includes("complaint") ||
      lower.includes("गड्ढा") ||
      lower.includes("शिकायत") ||
      lower.includes("ఫిర్యాదు")
    ) {
      setLastActionFeedback("Opening Hazard Report wizard...");
      speak("Opening hazard report wizard", language);
      setTimeout(() => {
        stopListening();
        setTranscript("");
        router.push("/report");
      }, 1000);
    } else if (
      lower.includes("safe") ||
      lower.includes("route") ||
      lower.includes("navigation") ||
      lower.includes("map") ||
      lower.includes("रास्ता") ||
      lower.includes("मार्ग") ||
      lower.includes("దారి")
    ) {
      setLastActionFeedback("Opening Safest Corridor...");
      speak("Finding safest route corridor", language);
      setTimeout(() => {
        stopListening();
        setTranscript("");
        router.push("/route");
      }, 1000);
    } else if (
      lower.includes("unsafe") ||
      lower.includes("help") ||
      lower.includes("emergency") ||
      lower.includes("danger") ||
      lower.includes("मदद") ||
      lower.includes("ఖతరా")
    ) {
      setLastActionFeedback("Emergency SOS broadcast activated!");
      triggerSOS();
      stopListening();
    }
  }, [transcript, router, speak, language, stopListening, setTranscript, triggerSOS]);

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      if (!supported) {
        speak("Voice recognition starting. Say 'Report pothole' or 'Safe route'", language);
      }
      startListening(language);
    }
  };

  return (
    <div className="fixed bottom-6 inset-x-0 z-50 flex flex-col items-center pointer-events-none px-4">
      {/* Speech feedback card */}
      <AnimatePresence>
        {(isListening || transcript || lastActionFeedback) && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-auto mb-3 max-w-sm w-full bg-[#3E000C]/95 backdrop-blur-2xl border border-[#FFECD1]/25 text-[#FFECD1] rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2"
          >
            <div className="flex items-center justify-between text-[11px] text-[#FFECD1]/70">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFECD1] animate-pulse" />
                {isListening ? t("listening") : "Voice Assistant"}
              </span>
              <button
                onClick={() => {
                  stopListening();
                  setTranscript("");
                  setLastActionFeedback(null);
                }}
                className="text-[#FFECD1]/50 hover:text-[#FFECD1]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs font-medium text-[#FFECD1]">
              {lastActionFeedback || transcript || t("speakNow")}
            </p>

            {/* Soundwave in Sand */}
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
                    className="w-0.5 bg-[#FFECD1] rounded-full h-3"
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimalist Floating Pill */}
      <div className="pointer-events-auto flex items-center gap-2 bg-[#3E000C]/90 backdrop-blur-2xl border border-[#FFECD1]/20 px-2.5 py-1.5 rounded-full shadow-2xl">
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          title="Voice Command Suggestions"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#FFECD1]/60 hover:text-[#FFECD1] hover:bg-[#FFECD1]/10 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        {/* Central Sand Mic Button */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.03 }}
          onClick={toggleMic}
          className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
            isListening
              ? "bg-[#FFECD1] text-[#3E000C] shadow-md ring-2 ring-[#FFECD1]/50"
              : "bg-[#FFECD1] text-[#3E000C] hover:bg-[#FFE5BF]"
          }`}
          aria-label="Toggle Voice Control"
        >
          {isListening ? (
            <MicOff className="w-4 h-4 text-[#3E000C]" />
          ) : (
            <Mic className="w-4 h-4 text-[#3E000C]" />
          )}
        </motion.button>

        <span className="text-[11px] font-medium text-[#FFECD1]/80 pr-2 pl-0.5 select-none">
          {isListening ? "Listening..." : "Tap to speak"}
        </span>
      </div>

      {/* Suggestion hints popup */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="pointer-events-auto mt-2 max-w-xs bg-[#3E000C] border border-[#FFECD1]/20 rounded-xl p-3 text-xs text-[#FFECD1] shadow-2xl"
          >
            <div className="flex items-center justify-between text-[#FFECD1]/60 mb-2 font-medium">
              <span>Voice commands:</span>
              <button onClick={() => setShowTooltip(false)}>
                <X className="w-3 h-3 text-[#FFECD1]/50 hover:text-[#FFECD1]" />
              </button>
            </div>
            <ul className="space-y-1.5 text-[#FFECD1]/80">
              <li
                className="flex items-center gap-1.5 hover:text-[#FFECD1] cursor-pointer"
                onClick={() => {
                  setTranscript("Report a pothole");
                  setShowTooltip(false);
                }}
              >
                <AlertTriangle className="w-3 h-3 text-[#FFECD1] shrink-0" />
                <span>"Report a pothole on this road"</span>
              </li>
              <li
                className="flex items-center gap-1.5 hover:text-[#FFECD1] cursor-pointer"
                onClick={() => {
                  setTranscript("Find safe route");
                  setShowTooltip(false);
                }}
              >
                <ShieldCheck className="w-3 h-3 text-[#FFECD1] shrink-0" />
                <span>"Find safest route home"</span>
              </li>
              <li
                className="flex items-center gap-1.5 hover:text-[#FFECD1] cursor-pointer"
                onClick={() => {
                  setTranscript("Emergency");
                  setShowTooltip(false);
                }}
              >
                <Navigation className="w-3 h-3 text-[#FFECD1] shrink-0" />
                <span>"Help, I feel unsafe here"</span>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
