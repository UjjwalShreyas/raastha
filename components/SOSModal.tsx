"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  PhoneCall,
  Radio,
  X,
  Share2,
  MessageCircle,
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { SOS_OPEN_EVENT, SOS_CLOSE_EVENT, closeSosSheet } from "@/lib/sosEvents";

export function SOSModal() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const { coordinates, accuracy, requestLocation } = useLocation();

  // Listen to window-level custom events
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      // Request high-accuracy GPS ONLY when the SOS sheet opens
      requestLocation();
    };

    const handleClose = () => {
      setIsOpen(false);
    };

    window.addEventListener(SOS_OPEN_EVENT, handleOpen);
    window.addEventListener(SOS_CLOSE_EVENT, handleClose);

    return () => {
      window.removeEventListener(SOS_OPEN_EVENT, handleOpen);
      window.removeEventListener(SOS_CLOSE_EVENT, handleClose);
    };
  }, [requestLocation]);

  if (!isOpen) return null;

  const latStr = coordinates.lat.toFixed(5);
  const lngStr = coordinates.lng.toFixed(5);
  const mapsUrl = `https://maps.google.com/?q=${latStr},${lngStr}`;
  const emergencyMessage = `EMERGENCY ASSISTANCE NEEDED: My live coordinates are ${latStr}, ${lngStr}. Live Google Maps link: ${mapsUrl}`;

  const handleWebShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Emergency Location",
          text: emergencyMessage,
          url: mapsUrl,
        });
      } catch (err) {
        console.warn("Share cancelled or failed:", err);
      }
    } else {
      await navigator.clipboard.writeText(emergencyMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl font-sans">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-md bg-[#3E000C] border border-[#FFECD1]/25 rounded-3xl p-6 shadow-2xl text-[#FFECD1] space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#FFECD1]/15">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-300">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#FFECD1]">
                  Emergency Safety Sheet
                </h2>
                <p className="text-[11px] text-[#FFECD1]/70">
                  Direct links to call police or share coordinates
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeSosSheet}
              className="p-1.5 text-[#FFECD1]/60 hover:text-[#FFECD1] rounded-lg hover:bg-[#FFECD1]/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Transparent Honest Disclaimer */}
          <div className="p-3 bg-[#FFECD1]/10 border border-[#FFECD1]/20 rounded-2xl flex items-start gap-2.5 text-xs text-[#FFECD1]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FFECD1]" />
            <p className="font-semibold leading-relaxed">
              These buttons open your own phone apps. Raastha does not send alerts on its own.
            </p>
          </div>

          {/* Live Coordinates Box */}
          <div className="bg-[#FFECD1]/8 p-3.5 rounded-2xl border border-[#FFECD1]/15 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#FFECD1]/70">
              <span className="flex items-center gap-1.5 font-bold">
                <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                Your Live GPS Coordinates
              </span>
              <span className="text-[#FFECD1] font-mono text-[10px]">
                {accuracy ? `Accuracy ±${Math.round(accuracy)}m` : "Acquiring..."}
              </span>
            </div>
            <div className="text-xs font-mono font-bold text-[#FFECD1] flex items-center justify-between">
              <span>{latStr}, {lngStr}</span>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] underline flex items-center gap-1 hover:text-[#FFECD1]/80"
              >
                Maps Link <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {/* 1. Direct Call 112 Button */}
            <a
              href="tel:112"
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call Police / Emergency (112)</span>
            </a>

            {/* Grid of External App Sharing Links */}
            <div className="grid grid-cols-3 gap-2">
              {/* WhatsApp Link */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(emergencyMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-[#FFECD1]/10 hover:bg-[#FFECD1]/20 border border-[#FFECD1]/20 text-center text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px]">WhatsApp</span>
              </a>

              {/* SMS Link */}
              <a
                href={`sms:?body=${encodeURIComponent(emergencyMessage)}`}
                className="p-3 rounded-2xl bg-[#FFECD1]/10 hover:bg-[#FFECD1]/20 border border-[#FFECD1]/20 text-center text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <Radio className="w-4 h-4 text-amber-300" />
                <span className="text-[11px]">Cellular SMS</span>
              </a>

              {/* Share / Copy Location */}
              <button
                type="button"
                onClick={handleWebShare}
                className="p-3 rounded-2xl bg-[#FFECD1]/10 hover:bg-[#FFECD1]/20 border border-[#FFECD1]/20 text-center text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4 text-sky-300" />
                )}
                <span className="text-[11px]">{copied ? "Copied" : "Share GPS"}</span>
              </button>
            </div>
          </div>

          {/* Dismiss button */}
          <div className="pt-2 border-t border-[#FFECD1]/15 text-center">
            <button
              type="button"
              onClick={closeSosSheet}
              className="text-xs font-semibold text-[#FFECD1]/70 hover:text-[#FFECD1] underline cursor-pointer"
            >
              Dismiss Safety Sheet
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
