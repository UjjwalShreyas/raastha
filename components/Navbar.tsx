"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  ShieldAlert,
  PlusCircle,
  Navigation,
  CheckCircle2,
  Building2,
  MapPin,
  Menu,
  X,
  WifiOff,
} from "lucide-react";
import { useApp, LanguageCode } from "@/context/AppContext";

export function Navbar() {
  const pathname = usePathname();
  const { language, setLanguage, t, triggerSOS, sosActive, isOnline } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Home and Overview are now separate screens
  const navLinks = [
    { href: "/", label: "Home", icon: Compass },
    { href: "/overview", label: "Overview", icon: MapPin },
    { href: "/report", label: t("reportProblem"), icon: PlusCircle },
    { href: "/route", label: t("safeRoute"), icon: Navigation },
    { href: "/my-reports", label: t("myReports"), icon: CheckCircle2 },
    { href: "/admin", label: t("authorityPortal"), icon: Building2 },
  ];

  return (
    <header className="sticky top-0 z-[100] w-full bg-[#FFECD1]/95 backdrop-blur-xl border-b border-[#3E000C]/12 shadow-xs">
      {!isOnline && (
        <div className="bg-[#3E000C] text-[#FFECD1] text-[11px] font-semibold py-1 px-4 text-center flex items-center justify-center gap-2 border-b border-[#FFECD1]/20">
          <WifiOff className="w-3 h-3 text-[#FFECD1]" />
          <span>{t("offlineNotice")}</span>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#3E000C] text-[#FFECD1] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4 text-[#FFECD1]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="tracking-tight font-bold text-base text-[#3E000C]">
                {t("appName")}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-[#3E000C]/70 bg-[#3E000C]/8 border border-[#3E000C]/15 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3E000C] animate-pulse" />
                Live Civic
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#3E000C]/5 p-1 rounded-xl border border-[#3E000C]/10 text-xs">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-[#3E000C] text-[#FFECD1] shadow-xs font-semibold"
                      : "text-[#3E000C]/70 hover:text-[#3E000C] hover:bg-[#3E000C]/8"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#FFECD1]" : "text-[#3E000C]/60"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Language & SOS */}
          <div className="flex items-center gap-2">
            {/* Minimal Language Switcher */}
            <div className="flex items-center bg-[#3E000C]/5 border border-[#3E000C]/12 rounded-lg p-0.5 text-[11px] font-medium">
              {(["EN", "HI", "TE"] as LanguageCode[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    language === lang
                      ? "bg-[#3E000C] text-[#FFECD1] font-semibold"
                      : "text-[#3E000C]/60 hover:text-[#3E000C]"
                  }`}
                >
                  {lang === "EN" ? "EN" : lang === "HI" ? "HI" : "TE"}
                </button>
              ))}
            </div>

            {/* Minimalist SOS Trigger */}
            <button
              onClick={triggerSOS}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                sosActive
                  ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C] animate-pulse"
                  : "bg-rose-950/10 border-rose-900/30 text-rose-900 hover:bg-rose-900/20"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SOS</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg bg-[#3E000C]/8 border border-[#3E000C]/15 text-[#3E000C]"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#FFECD1] border-b border-[#3E000C]/12 px-4 pt-2 pb-4 space-y-1 shadow-lg"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#3E000C] text-[#FFECD1] font-semibold"
                      : "text-[#3E000C]/70 hover:text-[#3E000C] hover:bg-[#3E000C]/8"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
