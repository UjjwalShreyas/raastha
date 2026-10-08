"use client";

import React from "react";
import { motion } from "framer-motion";
import { BellRing, X } from "lucide-react";

interface AlertToastProps {
  title: string;
  typeLabel: string;
  ward: string;
  severity: number;
  trackingId: string;
  viewLabel: string;
  dismissLabel: string;
  /** Shown when the browser blocked the alert sound. */
  soundBlockedMessage?: string | null;
  onView: () => void;
  onDismiss: () => void;
}

export function AlertToast({
  title,
  typeLabel,
  ward,
  severity,
  trackingId,
  viewLabel,
  dismissLabel,
  soundBlockedMessage,
  onView,
  onDismiss,
}: AlertToastProps) {
  return (
    <motion.div
      role="alert"
      aria-live="assertive"
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      className="fixed top-20 right-4 z-[120] w-[min(24rem,calc(100vw-2rem))] bg-[#3E000C] text-[#FFECD1] border border-[#FFECD1]/30 rounded-2xl shadow-2xl p-4 space-y-3 font-sans"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#FFECD1] text-[#3E000C] flex items-center justify-center shrink-0">
          <BellRing className="w-4 h-4 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#FFECD1]/70">
            {title}
          </div>
          <div className="text-sm font-bold">
            {typeLabel} · Sev {severity}/5
          </div>
          <div className="text-xs text-[#FFECD1]/85 truncate">{ward}</div>
          <div className="font-mono text-[10px] text-[#FFECD1]/60">{trackingId}</div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="p-1 text-[#FFECD1]/60 hover:text-[#FFECD1] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {soundBlockedMessage && (
        <p className="text-[11px] text-amber-200 bg-amber-200/10 border border-amber-200/25 rounded-lg px-2.5 py-1.5">
          {soundBlockedMessage}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 h-8 rounded-lg text-xs font-semibold text-[#FFECD1]/80 hover:text-[#FFECD1] border border-[#FFECD1]/25 cursor-pointer"
        >
          {dismissLabel}
        </button>
        <button
          type="button"
          onClick={onView}
          className="px-3.5 h-8 rounded-lg text-xs font-bold bg-[#FFECD1] text-[#3E000C] hover:opacity-90 cursor-pointer"
        >
          {viewLabel}
        </button>
      </div>
    </motion.div>
  );
}
