"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { AnimatePresence, motion } from "framer-motion";
import { VolumeX, X } from "lucide-react";

export function ToastBanner() {
  const { toast, clearToast } = useApp();

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-20 inset-x-0 z-[110] flex justify-center pointer-events-none px-4 font-sans"
        >
          <div className="pointer-events-auto max-w-md w-full bg-[#3E000C] text-[#FFECD1] border border-[#FFECD1]/25 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <VolumeX className="w-4 h-4 text-[#FFECD1]/80 shrink-0" />
              <span>{toast}</span>
            </div>
            <button
              type="button"
              onClick={clearToast}
              className="p-1 text-[#FFECD1]/60 hover:text-[#FFECD1] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
