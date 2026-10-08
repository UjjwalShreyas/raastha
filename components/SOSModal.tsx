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

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-2xl"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md rounded-3xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
        >
          {/* Red Alert Header */}
          <div className="bg-gradient-to-r from-red-700 via-red-600 to-rose-700 p-5 relative overflow-hidden">
            {/* Animated pulse effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-800/0 via-white/[0.07] to-red-800/0 animate-pulse" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Emergency Safety</h2>
                  <p className="text-[11px] text-white/70">Direct links to call or share your location</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSosSheet}
                className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="bg-gradient-to-b from-[#3E000C] to-[#2A0008] p-5 space-y-4 text-[#FFECD1]">
            {/* Disclaimer */}
            <div className="p-3 bg-[#FFECD1]/8 border border-[#FFECD1]/12 rounded-2xl flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <p className="font-medium leading-relaxed text-[#FFECD1]/80">
                These buttons open your own phone apps. Raastha does not send alerts automatically.
              </p>
            </div>

            {/* GPS Coordinates */}
            <div className="bg-[#FFECD1]/6 p-4 rounded-2xl border border-[#FFECD1]/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#FFECD1]/60">
                <span className="flex items-center gap-1.5 font-bold">
                  <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  Live GPS Coordinates
                </span>
                <span className="font-mono text-[10px] text-[#FFECD1]/50">
                  {accuracy ? `±${Math.round(accuracy)}m` : "Acquiring..."}
                </span>
              </div>
              <div className="text-sm font-mono font-bold text-[#FFECD1] flex items-center justify-between">
                <span>{latStr}, {lngStr}</span>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#FFECD1]/60 hover:text-[#FFECD1] flex items-center gap-1 underline transition-colors"
                >
                  Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Call 112 */}
              <a
                href="tel:112"
                className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-lg transition-all"
              >
                <PhoneCall className="w-5 h-5" />
                <span>Call Police / Emergency (112)</span>
              </a>

              {/* Sharing Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(emergencyMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-2xl bg-[#FFECD1]/6 hover:bg-[#FFECD1]/12 border border-[#FFECD1]/10 text-center transition-all flex flex-col items-center gap-2 cursor-pointer group"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold">WhatsApp</span>
                </a>

                <a
                  href={`sms:?body=${encodeURIComponent(emergencyMessage)}`}
                  className="p-3.5 rounded-2xl bg-[#FFECD1]/6 hover:bg-[#FFECD1]/12 border border-[#FFECD1]/10 text-center transition-all flex flex-col items-center gap-2 cursor-pointer group"
                >
                  <Radio className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold">SMS</span>
                </a>

                <button
                  type="button"
                  onClick={handleWebShare}
                  className="p-3.5 rounded-2xl bg-[#FFECD1]/6 hover:bg-[#FFECD1]/12 border border-[#FFECD1]/10 text-center transition-all flex flex-col items-center gap-2 cursor-pointer group"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  ) : (
                    <Share2 className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[11px] font-bold">{copied ? "Copied!" : "Share GPS"}</span>
                </button>
              </div>
            </div>

            {/* Dismiss */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={closeSosSheet}
                className="text-xs font-medium text-[#FFECD1]/40 hover:text-[#FFECD1]/70 underline cursor-pointer transition-colors"
              >
                Dismiss safety sheet
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
