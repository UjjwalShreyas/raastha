"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  User,
  LogOut,
  ShieldCheck,
  UserCheck,
  ChevronDown,
} from "lucide-react";
import { useApp, LanguageCode } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useIssues } from "@/context/IssuesContext";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t, triggerSOS, isOnline } = useApp();
  const {
    citizen,
    isCitizenAuthenticated,
    citizenLogout,
    authority,
    isAuthorityAuthenticated,
    authorityLogout,
    appMode,
    setAppMode,
  } = useAuth();
  const { unseenHighCount } = useIssues();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthority = isAuthorityAuthenticated;

  const navLinks = [
    { href: "/", label: "Home", icon: Compass },
    { href: "/overview", label: "Overview", icon: MapPin },
    { href: "/report", label: t("reportProblem"), icon: PlusCircle },
    { href: "/route", label: t("safeRoute"), icon: Navigation },
    { href: "/my-reports", label: t("myReports"), icon: CheckCircle2 },
    ...(appMode === "authority" && isAuthority
      ? [{ href: "/admin", label: "Command Center", icon: Building2, badge: unseenHighCount }]
      : []),
  ];

  const renderBadge = (count?: number) =>
    count && count > 0 ? (
      <span
        className="min-w-4 h-4 px-1 rounded-full bg-gradient-to-r from-red-600 to-rose-700 text-white text-[9px] font-black flex items-center justify-center shadow-sm"
        aria-label={`${count} unseen high-severity reports`}
      >
        {count}
      </span>
    ) : null;

  return (
    <header className="sticky top-0 z-[100] w-full">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-[#3E000C] text-[#FFECD1] text-[11px] font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2">
          <WifiOff className="w-3 h-3" />
          <span>{t("offlineNotice")}</span>
        </div>
      )}

      {/* Mode Switcher Bar */}
      <div className="bg-[#3E000C]/[0.04] backdrop-blur-sm border-b border-[#3E000C]/6 px-4 py-1">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-[#3E000C]/40 uppercase tracking-wider text-[9px] hidden sm:inline">
              Mode:
            </span>
            <div className="flex items-center glass-card rounded-lg p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setAppMode("citizen");
                  if (pathname.startsWith("/admin")) router.push("/");
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  appMode === "citizen"
                    ? "bg-[#3E000C] text-[#FFECD1] shadow-sm"
                    : "text-[#3E000C]/50 hover:text-[#3E000C]/80"
                }`}
              >
                <User className="w-3 h-3" />
                <span>Citizen</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAppMode("authority");
                  if (!isAuthority) router.push("/admin/login");
                  else router.push("/admin");
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  appMode === "authority"
                    ? "bg-[#3E000C] text-[#FFECD1] shadow-sm"
                    : "text-[#3E000C]/50 hover:text-[#3E000C]/80"
                }`}
              >
                <Building2 className="w-3 h-3" />
                <span>Authority</span>
              </button>
            </div>
          </div>

          {/* Active User Badge */}
          <div className="flex items-center gap-2">
            {isAuthority ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>{authority?.name || "Official"}</span>
              </span>
            ) : isCitizenAuthenticated ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-[#3E000C]/70 glass-card px-2 py-0.5 rounded-full">
                <UserCheck className="w-3 h-3 text-[#3E000C]/60" />
                <span>{citizen?.name}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="bg-[#FFECD1]/80 backdrop-blur-xl border-b border-[#3E000C]/8 shadow-[0_1px_3px_rgba(62,0,12,0.04)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-3">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3E000C] to-[#5C1020] text-[#FFECD1] flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                <Compass className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="tracking-tight font-bold text-base text-[#3E000C]"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                >
                  {t("appName")}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold text-[#3E000C]/50 glass-card rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {appMode === "authority" ? "Official" : "Civic"}
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center glass-card p-1 rounded-xl text-xs">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[#3E000C] text-[#FFECD1] shadow-sm font-semibold"
                        : "text-[#3E000C]/55 hover:text-[#3E000C] hover:bg-[#3E000C]/6"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#FFECD1]" : "text-[#3E000C]/45"}`} />
                    <span>{link.label}</span>
                    {renderBadge(link.badge)}
                  </Link>
                );
              })}
            </nav>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* User / Login */}
              {isCitizenAuthenticated || isAuthority ? (
                <div className="flex items-center gap-1.5 glass-card rounded-xl px-2.5 py-1.5 text-xs">
                  <span className="font-semibold text-[#3E000C] max-w-[100px] truncate text-[11px]">
                    {isAuthority ? authority?.name?.split(",")[0] : citizen?.name?.split(" ")[0]}
                  </span>
                  <button
                    type="button"
                    title="Sign Out"
                    onClick={() => {
                      if (isAuthority) authorityLogout();
                      if (isCitizenAuthenticated) citizenLogout();
                    }}
                    className="p-1 text-[#3E000C]/40 hover:text-red-600 cursor-pointer rounded transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card text-xs font-semibold text-[#3E000C] hover:bg-white transition-all"
                >
                  <User className="w-3.5 h-3.5 text-[#3E000C]/60" />
                  <span>Sign In</span>
                </Link>
              )}

              {/* Language */}
              <div className="flex items-center glass-card rounded-lg p-0.5 text-[11px] font-medium">
                {(["EN", "HI", "TE"] as LanguageCode[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                      language === lang
                        ? "bg-[#3E000C] text-[#FFECD1] font-semibold shadow-sm"
                        : "text-[#3E000C]/40 hover:text-[#3E000C]/70"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              {/* SOS */}
              <button
                onClick={triggerSOS}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md hover:shadow-lg hover:from-red-700 hover:to-rose-800"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>SOS</span>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl glass-card text-[#3E000C] cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
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
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="lg:hidden bg-[#FFECD1]/95 backdrop-blur-xl border-b border-[#3E000C]/8 px-4 pt-2 pb-4 space-y-1 shadow-lg"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#3E000C] text-[#FFECD1] font-semibold shadow-sm"
                      : "text-[#3E000C]/60 hover:text-[#3E000C] hover:bg-[#3E000C]/6"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                  {renderBadge(link.badge)}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
