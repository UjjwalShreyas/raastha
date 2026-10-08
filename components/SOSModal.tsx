"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, PhoneCall, Radio, CheckCircle, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Button } from "./ui/Button";

export function SOSModal() {
  const { sosActive, dismissSOS, t } = useApp();
  const { coordinates, accuracy } = useGeolocation();
  const [countdown, setCountdown] = useState<number>(5);
  const [dispatchStatus, setDispatchStatus] = useState<"broadcasting" | "dispatched">("broadcasting");

  useEffect(() => {
    if (!sosActive) {
      setCountdown(5);
      setDispatchStatus("broadcasting");
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setDispatchStatus("dispatched");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sosActive]);

  if (!sosActive) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
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
              <div className="w-8 h-8 rounded-xl bg-[#FFECD1]/10 border border-[#FFECD1]/30 flex items-center justify-center text-[#FFECD1]">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#FFECD1]">
                  {t("sosTriggered")}
                </h2>
                <p className="text-[11px] text-[#FFECD1]/60">
                  Civic Emergency Protocol #RST-SOS-911
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
            <div className="bg-[#FFECD1]/5 p-3.5 rounded-xl border border-[#FFECD1]/15 text-xs text-[#FFECD1]/90">
              <p className="font-medium text-[#FFECD1]">{t("sosDesc")}</p>
              <p className="text-[#FFECD1]/60 mt-1">
                Live location broadcasted to nearest patrolling squad and emergency contacts.
              </p>
            </div>

            {/* Live GPS Coordinates */}
            <div className="bg-[#FFECD1]/5 p-3.5 rounded-xl border border-[#FFECD1]/15 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#FFECD1]/70">
                <span className="flex items-center gap-1.5 font-medium">
                  <Radio className="w-3.5 h-3.5 text-[#FFECD1] animate-pulse" />
                  Live GPS Dispatch
                </span>
                <span className="text-[#FFECD1] font-medium">Locked (±{accuracy || 10}m)</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-[#FFECD1]">
                <span>
                  {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFECD1]/10 border border-[#FFECD1]/20 text-[#FFECD1]">
                  Koramangala 4th Block
                </span>
              </div>
            </div>

            {/* Countdown / Dispatch Status */}
            <div className="text-center py-2">
              {dispatchStatus === "broadcasting" ? (
                <div className="space-y-1">
                  <div className="text-xl font-bold text-[#FFECD1]">
                    Auto-dispatching in <span className="text-white underline decoration-[#FFECD1]">{countdown}s</span>
                  </div>
                  <p className="text-[11px] text-[#FFECD1]/60">Tap cancel if triggered accidentally.</p>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-[#FFECD1] font-medium text-sm bg-[#FFECD1]/15 border border-[#FFECD1]/30 py-2.5 rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                  <span>Patrol Unit #14 En Route (ETA: 4 mins)</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2.5 pt-1">
            <Button
              variant="primary"
              size="md"
              className="flex-1 font-semibold"
              leftIcon={<PhoneCall className="w-4 h-4" />}
              onClick={() => {
                window.location.href = "tel:112";
              }}
            >
              Call 112 / 1091
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-28 text-[#FFECD1]/80 hover:text-[#FFECD1]"
              onClick={dismissSOS}
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
