"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, PhoneCall, Radio, X, Share2, MessageCircle, Copy, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "./ui/Button";

export function SOSModal() {
  const { sosActive, dismissSOS, coordinates, locationAccuracy } = useApp();
  const [copied, setCopied] = useState<boolean>(false);

  if (!sosActive) return null;

  const googleMapsUrl = `https://maps.google.com/?q=${coordinates.lat.toFixed(5)},${coordinates.lng.toFixed(5)}`;
  const emergencyMessage = `EMERGENCY ALERT (Raastha): I need immediate assistance! My live GPS coordinates are ${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}. View live location on Google Maps: ${googleMapsUrl}`;

  const handleWebShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Raastha Emergency SOS",
          text: emergencyMessage,
          url: googleMapsUrl,
        });
      } catch (e) {
        console.warn("Share cancelled or unsupported:", e);
      }
    } else {
      await navigator.clipboard.writeText(emergencyMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(emergencyMessage)}`;
    window.open(url, "_blank");
  };

  const handleSmsShare = () => {
    const url = `sms:?body=${encodeURIComponent(emergencyMessage)}`;
    window.location.href = url;
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
              <div className="w-8 h-8 rounded-xl bg-red-600/25 border border-red-500/40 flex items-center justify-center text-red-300">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#FFECD1]">
                  Emergency SOS Location Sharing
                </h2>
                <p className="text-[11px] text-[#FFECD1]/70">
                  Instant location dispatch to trusted contacts & emergency services
                </p>
              </div>
            </div>
            <button
              onClick={dismissSOS}
              className="p-1.5 text-[#FFECD1]/60 hover:text-[#FFECD1] rounded-lg hover:bg-[#FFECD1]/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="space-y-4">
            {/* Live GPS Coordinates */}
            <div className="bg-[#FFECD1]/8 p-3.5 rounded-2xl border border-[#FFECD1]/15 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#FFECD1]/70">
                <span className="flex items-center gap-1.5 font-bold">
                  <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  Live GPS Signal
                </span>
                <span className="text-[#FFECD1] font-mono text-[10px]">
                  Accuracy: ±{locationAccuracy || 12}m
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-[#FFECD1] flex items-center justify-between">
                <span>
                  {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFECD1]/10 font-sans">
                  Hyderabad
                </span>
              </div>
            </div>

            {/* Emergency Sharing Buttons */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFECD1]/70 block">
                Share Live GPS Coordinates Via:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="p-2.5 rounded-xl bg-[#FFECD1]/10 hover:bg-[#FFECD1]/20 border border-[#FFECD1]/20 text-center text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px]">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleSmsShare}
                  className="p-2.5 rounded-xl bg-[#FFECD1]/10 hover:bg-[#FFECD1]/20 border border-[#FFECD1]/20 text-center text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer"
                >
                  <Radio className="w-4 h-4 text-amber-300" />
                  <span className="text-[11px]">Cellular SMS</span>
                </button>

                <button
                  type="button"
                  onClick={handleWebShare}
                  className="p-2.5 rounded-xl bg-[#FFECD1]/10 hover:bg-[#FFECD1]/20 border border-[#FFECD1]/20 text-center text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Share2 className="w-4 h-4 text-sky-300" />
                  )}
                  <span className="text-[11px]">{copied ? "Copied" : "Share / Copy"}</span>
                </button>
              </div>
            </div>

            {/* Direct Call 112 Action */}
            <div className="pt-2 flex gap-2.5">
              <Button
                variant="primary"
                size="md"
                className="flex-1 font-bold bg-red-600 hover:bg-red-700 text-white border-none"
                leftIcon={<PhoneCall className="w-4 h-4" />}
                onClick={() => {
                  window.location.href = "tel:112";
                }}
              >
                Call Police (112)
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="w-28 text-[#FFECD1]/80 hover:text-[#FFECD1]"
                onClick={dismissSOS}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
