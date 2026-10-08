"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Mic,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Loader2,
  AlertTriangle,
  Sparkles,
  Sliders,
  CheckCircle,
  UploadCloud,
  Zap,
  Info,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useIssues, IssueType } from "@/context/IssuesContext";
import { useLocation } from "@/context/LocationContext";
import { DynamicMap } from "@/components/map/DynamicMap";
import { Button } from "@/components/ui/Button";
import { HazardAnalysisResult } from "@/app/api/analyze-hazard/route";

// Self-contained embedded SVG images for presets (Zero CORS issues, Hyderabad themes)
const PRESET_IMAGES: {
  type: "Pothole" | "Broken Streetlight" | "Waterlogging" | "Open Manhole";
  title: string;
  dataUrl: string;
}[] = [
  {
    type: "Pothole",
    title: "Deep Pothole at Cyber Towers Incline",
    dataUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="600" height="400" fill="#2d2d30"/>
        <line x1="0" y1="210" x2="600" y2="210" stroke="#f1c40f" stroke-dasharray="30,25" stroke-width="6"/>
        <ellipse cx="300" cy="240" rx="160" ry="85" fill="#141416" stroke="#48484e" stroke-width="5"/>
        <ellipse cx="295" cy="245" rx="120" ry="60" fill="#08080a"/>
        <circle cx="270" cy="240" r="12" fill="#3a3a3e"/>
        <circle cx="330" cy="260" r="16" fill="#29292c"/>
        <text x="30" y="50" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="20">HITEC CITY - SEVERE ROADWAY CAVITY</text>
        <text x="30" y="80" fill="#e74c3c" font-family="Helvetica, Arial, sans-serif" font-size="14">Estimated Depth: ~15cm | Risk: 2-Wheeler Rim Damage</text>
      </svg>
    `),
  },
  {
    type: "Broken Streetlight",
    title: "Extinguished Luminaire on Durgam Cheruvu Lane",
    dataUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="600" height="400" fill="#12131a"/>
        <line x1="280" y1="120" x2="280" y2="400" stroke="#3f4254" stroke-width="14"/>
        <path d="M280,130 C280,70 360,70 370,110" fill="none" stroke="#3f4254" stroke-width="10"/>
        <polygon points="350,110 390,110 400,140 340,140" fill="#232634" stroke="#ff4d4f" stroke-width="2"/>
        <circle cx="370" cy="125" r="4" fill="#ff4d4f"/>
        <text x="30" y="50" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="20">DARK STRETCH - UNLIT STREETLIGHT ARRAY</text>
        <text x="30" y="80" fill="#ffb84d" font-family="Helvetica, Arial, sans-serif" font-size="14">Pedestrian Risk: Zero Illumination (0 LUX)</text>
      </svg>
    `),
  },
  {
    type: "Open Manhole",
    title: "Exposed Drainage Chamber in Kondapur",
    dataUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="600" height="400" fill="#35363a"/>
        <circle cx="300" cy="220" r="85" fill="#050505" stroke="#ff3838" stroke-width="6"/>
        <circle cx="300" cy="220" r="70" fill="#000000"/>
        <circle cx="430" cy="200" r="75" fill="#222326" stroke="#718093" stroke-width="6" stroke-dasharray="10,5"/>
        <text x="30" y="50" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="20">OPEN DRAIN CHAMBER - LIFE THREAT</text>
        <text x="30" y="80" fill="#ff3838" font-family="Helvetica, Arial, sans-serif" font-size="14">Fall Hazard: 2.1m Deep Uncovered Conduit</text>
      </svg>
    `),
  },
  {
    type: "Waterlogging",
    title: "Gachibowli Monsoon Waterlogging",
    dataUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="600" height="400" fill="#2c3e50"/>
        <rect x="0" y="180" width="600" height="220" fill="#1b2a47" opacity="0.9"/>
        <path d="M0,190 Q150,180 300,195 T600,185" stroke="#48dbfb" stroke-width="3" fill="none"/>
        <rect x="180" y="160" width="240" height="80" fill="#576574" stroke="#c8d6e5" stroke-width="2"/>
        <text x="30" y="50" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="20">MONSOON DRAIN CHOKE - WATERLOGGING</text>
        <text x="30" y="80" fill="#00d2d3" font-family="Helvetica, Arial, sans-serif" font-size="14">Carriageway Submerged: ~25cm Inundation</text>
      </svg>
    `),
  },
];

// Client-side image compression to prevent Vercel body size limits
function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ReportWizardPage() {
  const router = useRouter();
  const { language, voice, setVoiceMode, t } = useApp();
  const { addReportedIssue, isConfigured } = useIssues();
  const { coordinates, requestLocation, isReal } = useLocation();

  // Set dictation mode on mount to avoid VoiceBar keyword interference, restore on unmount
  useEffect(() => {
    setVoiceMode("dictation");
    return () => {
      setVoiceMode("command");
    };
  }, [setVoiceMode]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isScanningPhoto, setIsScanningPhoto] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<HazardAnalysisResult | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isAiApplied, setIsAiApplied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form parameters (with manual override capability)
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [hazardType, setHazardType] = useState<string>("Pothole");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [needsFixing, setNeedsFixing] = useState<boolean>(true);
  const [exposureCount, setExposureCount] = useState<number>(3500);
  const [ward, setWard] = useState<string>("Circle 20 - Madhapur / Serilingampally, Hyderabad");

  const [clarifications, setClarifications] = useState<{ question: string; answer?: string }[]>([
    { question: "Is the road completely blocked for two-wheelers?" },
    { question: "Is water accumulation hiding the cavity depth?" },
  ]);

  // Call the AI backend route
  const analyzeImageWithAi = async (base64Data: string, mimeType: string = "image/jpeg") => {
    setIsScanningPhoto(true);
    setAiMessage(null);

    try {
      const res = await fetch("/api/analyze-hazard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Data, mimeType }),
      });

      const data = await res.json();

      if (data.available && data.analysis) {
        const analysis: HazardAnalysisResult = data.analysis;

        // Check if Gemini detected that this is NOT an authentic roadway hazard
        if (analysis.isHazard === false) {
          setIsAiApplied(false);
          setAiAnalysis(analysis);
          setAiMessage(
            "Notice: No road or municipal hazard was detected in this photo. If this is an error, please choose the category and severity manually below."
          );
          setIsManualOverride(true);
          setSeverity(1);
          setNeedsFixing(false);
          return;
        }

        setAiAnalysis(analysis);
        setIsAiApplied(true);
        setSeverity(analysis.severity);
        setNeedsFixing(analysis.needsFixing);
        setDescription(analysis.impactDescription);

        if (analysis.hazardType && analysis.hazardType !== "Other") {
          setHazardType(analysis.hazardType);
        }

        if (analysis.clarifications && analysis.clarifications.length > 0) {
          setClarifications(analysis.clarifications);
        }

        setTitle(`${analysis.hazardIndex} (${analysis.detectedObject})`);
        setAiMessage("✨ Gemini Vision AI analyzed this hazard successfully.");
      } else {
        // Honest fallback: API unavailable, ask user to set severity manually. Never invent detections!
        setIsAiApplied(false);
        setAiMessage(data.message || data.error || "Gemini Vision is unavailable. Please choose the hazard severity manually below.");
        setIsManualOverride(true);
      }
    } catch (err) {
      console.warn("AI analysis network issue:", err);
      setAiMessage("Network issue calling Gemini. Please select the severity manually below.");
      setIsManualOverride(true);
    } finally {
      setIsScanningPhoto(false);
    }
  };

  // Handle uploaded file with client-side canvas compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const compressedBase64 = await compressImageToDataUrl(file);
    setPhotoUrl(compressedBase64);
    await analyzeImageWithAi(compressedBase64, "image/jpeg");
  };

  // Select preset SVG image and send to AI immediately
  const handleSelectPreset = async (preset: typeof PRESET_IMAGES[0]) => {
    setPhotoUrl(preset.dataUrl);
    setHazardType(preset.type);
    setTitle(preset.title);
    setIsScanningPhoto(true);

    try {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngBase64 = canvas.toDataURL("image/png");
          
          // Create synthetic File from blob for database upload
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], `${preset.type.toLowerCase()}-demo.png`, {
                type: "image/png",
              });
              setPhotoFile(file);
            }
          }, "image/png");

          await analyzeImageWithAi(pngBase64, "image/png");
        } else {
          setIsScanningPhoto(false);
        }
      };
      img.onerror = () => {
        setIsScanningPhoto(false);
      };
      img.src = preset.dataUrl;
    } catch {
      setIsScanningPhoto(false);
    }
  };

  const handleManualSeverityChange = (level: 1 | 2 | 3 | 4 | 5) => {
    setSeverity(level);
    setIsManualOverride(true);
    setNeedsFixing(level >= 3);
  };

  const priorityScore = Math.round((severity * exposureCount) / 100);

  const handleSubmitReport = async () => {
    if (!photoFile) {
      alert("A genuine photo of the hazard is strictly required before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      let mappedType: IssueType = "pothole";
      const ht = hazardType.toLowerCase();
      if (ht.includes("light") || ht.includes("lamp")) mappedType = "streetlight";
      else if (ht.includes("garbage") || ht.includes("debris")) mappedType = "garbage";
      else if (ht.includes("water")) mappedType = "waterlogging";
      else if (!ht.includes("pothole")) mappedType = "other";

      const createdRow = await addReportedIssue({
        type: mappedType,
        severity,
        severitySource: isManualOverride ? "manual" : "ai",
        description: description || title || `${hazardType} reported on ${ward}`,
        lat: coordinates.lat,
        lng: coordinates.lng,
        ward,
        photo: photoFile,
        aiSummary: aiAnalysis ? `${aiAnalysis.hazardIndex} (${aiAnalysis.detectedObject})` : undefined,
      });

      const successMsg = `${t("reportSuccess")} ${createdRow.tracking_id}`;
      voice.speak(successMsg, language);

      router.push("/my-reports");
    } catch (err: any) {
      alert(`Submission error: ${err.message || "Failed to submit report"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Wizard Header */}
      <div className="flex items-center justify-between border-b border-[#3E000C]/12 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3E000C] flex items-center gap-2.5">
            <Camera className="w-6 h-6 text-[#3E000C]" />
            <span>Hazard Reporter & AI Inspector</span>
          </h1>
          <p className="text-[#3E000C]/65 text-xs mt-1 font-normal">
            Upload a pothole or hazard photo to get automated AI severity scores and urgent fix validation.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                step === s
                  ? "bg-[#3E000C] text-[#FFECD1]"
                  : step > s
                  ? "bg-[#3E000C]/15 text-[#3E000C]"
                  : "bg-white text-[#3E000C]/40 border border-[#3E000C]/15"
              }`}
            >
              {step > s ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
            </div>
          ))}
        </div>
      </div>

      {/* Backend not configured banner */}
      {!isConfigured && (
        <div className="bg-amber-100/90 border border-amber-300 text-amber-900 rounded-2xl p-3.5 text-xs flex items-center gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-amber-700" />
          <span>
            <strong>Backend not configured:</strong> Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> to enable live cross-device sync.
          </span>
        </div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-[#3E000C] flex items-center gap-2">
                  <span>Step 1: Upload or Snap Hazard Photo</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3E000C]/8 text-[#3E000C] border border-[#3E000C]/15">
                    Gemini Vision Scan
                  </span>
                </h2>
                <p className="text-xs text-[#3E000C]/65 font-normal">
                  Upload an authentic photo. Gemini AI will inspect cavity depth or lighting, verify if it is an authentic hazard, and score its severity.
                </p>
              </div>

              {photoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl(null);
                    setAiAnalysis(null);
                    setIsAiApplied(false);
                  }}
                  className="text-xs font-semibold text-[#3E000C]/60 hover:text-[#3E000C] underline cursor-pointer"
                >
                  Clear Photo
                </button>
              )}
            </div>

            {/* Photo Box */}
            <div className="border border-dashed border-[#3E000C]/25 hover:border-[#3E000C]/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors bg-[#FFECD1]/20 min-h-[220px]">
              {photoUrl ? (
                <div className="relative w-full max-h-[280px] overflow-hidden rounded-xl border border-[#3E000C]/15 bg-black/5 flex items-center justify-center">
                  <img
                    src={photoUrl}
                    alt="Uploaded Hazard"
                    className="w-full h-full max-h-[280px] object-contain rounded-xl"
                  />

                  {/* Scanning Animation */}
                  {isScanningPhoto && (
                    <div className="absolute inset-0 bg-[#FFECD1]/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-[#3E000C]">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#3E000C]" />
                        <Sparkles className="w-4 h-4 text-[#3E000C] absolute" />
                      </div>
                      <span className="text-xs font-bold tracking-tight">Gemini AI is inspecting depth & severity score...</span>
                      <span className="text-[11px] text-[#3E000C]/70">Checking cavity depth, streetlight lumens & fix urgency</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3.5 py-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#3E000C]/8 border border-[#3E000C]/15 flex items-center justify-center text-[#3E000C] mx-auto">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#3E000C]">
                      Drop hazard photo or browse
                    </p>
                    <p className="text-xs text-[#3E000C]/60 mt-0.5">Supports JPG, PNG, WEBP (auto-compressed)</p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <span className="px-4 py-2 rounded-xl bg-[#3E000C] text-[#FFECD1] text-xs font-bold cursor-pointer transition-all hover:opacity-90 shadow-2xs">
                        Select Road Photo
                      </span>
                    </label>

                    {/* Instant Demo Pothole Button */}
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(PRESET_IMAGES[0])}
                      className="px-3.5 py-2 rounded-xl bg-white text-[#3E000C] border border-[#3E000C]/25 text-xs font-semibold cursor-pointer hover:border-[#3E000C] transition-all flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#3E000C]" />
                      <span>Test Demo Pothole</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Severity Inspection Card */}
            <div className="bg-[#FFECD1]/35 border border-[#3E000C]/15 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#3E000C]/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#3E000C]" />
                  <span className="text-xs font-bold text-[#3E000C] uppercase tracking-wider">
                    {isAiApplied ? "Gemini AI Severity & Repair Diagnosis" : "Severity Assessment & Repair Verdict"}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#3E000C]/8 text-[#3E000C] border border-[#3E000C]/12">
                  {isScanningPhoto
                    ? "Scanning..."
                    : isAiApplied
                    ? `Confidence: ${aiAnalysis?.confidence || 94}%`
                    : "Ready for scan"}
                </span>
              </div>

              {/* Severity Score + Needs Fixing Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Severity Score Gauge */}
                <div className="bg-white p-4 rounded-xl border border-[#3E000C]/12 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#3E000C]/75">Severity Score</span>
                    <span className="text-base font-black text-[#3E000C]">{severity} / 5</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 h-3">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        className={`rounded-sm transition-all duration-300 ${
                          lvl <= severity
                            ? lvl >= 4
                              ? "bg-[#3E000C]"
                              : lvl === 3
                              ? "bg-[#3E000C]/80"
                              : "bg-[#3E000C]/40"
                            : "bg-[#3E000C]/10"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="text-[11px] font-semibold text-[#3E000C]">
                    {severity === 1 && "Level 1: Minor Cosmetic Crack (No danger)"}
                    {severity === 2 && "Level 2: Shallow Depression (<3cm, Low danger)"}
                    {severity === 3 && "Level 3: Moderate Pothole (3-8cm, Vehicles brake)"}
                    {severity === 4 && "Level 4: Severe Cavity (>8cm, Wheel rim risk)"}
                    {severity === 5 && "Level 5: Critical Collapse / Cavern (Urgent life safety)"}
                  </div>
                </div>

                {/* 2. Needs Fixing Verdict */}
                <div className="bg-white p-4 rounded-xl border border-[#3E000C]/12 flex items-start gap-3">
                  {needsFixing ? (
                    <div className="w-8 h-8 rounded-lg bg-[#3E000C] text-[#FFECD1] flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-[#3E000C]/60">
                      Repair Necessity Verdict
                    </div>
                    <div
                      className={`text-sm font-black ${
                        needsFixing ? "text-[#3E000C]" : "text-emerald-800"
                      }`}
                    >
                      {needsFixing ? "Strictly Needs Fixing" : "Not Severe / Low Urgency"}
                    </div>
                    <p className="text-[11px] text-[#3E000C]/75 leading-tight">
                      {needsFixing
                        ? "Urgent municipal dispatch warranted. Poses accident hazard to commuters."
                        : "Superficial surface wear. Commuters safe; logged for scheduled maintenance."}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Details / Impact Summary */}
              {aiAnalysis && (
                <div className="bg-white/80 p-3.5 rounded-xl border border-[#3E000C]/10 space-y-1">
                  <div className="text-xs font-bold text-[#3E000C]">
                    Detected: {aiAnalysis.detectedObject}
                  </div>
                  <p className="text-xs text-[#3E000C]/80 leading-relaxed font-normal">
                    {aiAnalysis.impactDescription}
                  </p>
                </div>
              )}

              {/* Status Message */}
              {aiMessage && (
                <div className="text-xs text-[#3E000C]/85 bg-white p-2.5 rounded-xl border border-[#3E000C]/10 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-[#3E000C] shrink-0" />
                  <span>{aiMessage}</span>
                </div>
              )}

              {/* Manual Severity Controls */}
              <div className="pt-2 border-t border-[#3E000C]/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3E000C] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#3E000C]" />
                    <span>Manually Adjust Severity (If AI misjudged or API fails):</span>
                  </span>
                  {isManualOverride && (
                    <span className="text-[10px] font-semibold text-[#3E000C]/70">
                      Manual Override Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleManualSeverityChange(s as 1 | 2 | 3 | 4 | 5)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        severity === s
                          ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C] shadow-2xs"
                          : "bg-white text-[#3E000C] border-[#3E000C]/15 hover:border-[#3E000C]/40"
                      }`}
                    >
                      <div>Level {s}</div>
                      <div className="text-[9px] font-normal opacity-80 mt-0.5">
                        {s >= 3 ? "Fix" : "Safe"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Test Samples */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-[#3E000C]/60 uppercase tracking-wider block">
                Or click a sample hazard photo to test:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESET_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="relative rounded-xl overflow-hidden border border-[#3E000C]/15 hover:border-[#3E000C]/50 transition-all group text-left h-20 cursor-pointer shadow-2xs bg-[#FFECD1]/30"
                  >
                    <img
                      src={preset.dataUrl}
                      alt={preset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#3E000C]/90 via-[#3E000C]/40 to-transparent p-2 flex items-end">
                      <span className="text-[11px] font-bold text-[#FFECD1] line-clamp-1">
                        {preset.type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1 Continue Action */}
            <div className="flex justify-end pt-4 border-t border-[#3E000C]/10">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (!photoUrl) {
                    alert("Please select or snap a hazard photo to proceed.");
                    return;
                  }
                  setStep(2);
                }}
                disabled={!photoUrl || isScanningPhoto}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Details
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs"
          >
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#3E000C]">
                Step 2: Voice Dictation & Description
              </h2>
              <p className="text-xs text-[#3E000C]/65 font-normal">
                Dictate additional context or landmark details in {language}.
              </p>
            </div>

            {/* Voice Dictation (In dictation mode, VoiceBar ignores commands) */}
            <div className="bg-[#FFECD1]/20 p-4 rounded-2xl border border-[#3E000C]/12 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#3E000C] flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#3E000C] animate-pulse" />
                  Voice Dictation ({language})
                </span>
                <Button
                  variant={voice.isListening ? "danger" : "secondary"}
                  size="sm"
                  onClick={() => {
                    if (voice.isListening) {
                      voice.stopListening();
                    } else {
                      voice.startListening(language);
                    }
                  }}
                >
                  {voice.isListening ? "Stop Voice" : "Tap to Speak"}
                </Button>
              </div>

              <textarea
                value={voice.transcript || description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (voice.setTranscript) voice.setTranscript(e.target.value);
                }}
                placeholder="Speak or type hazard details... (e.g. Deep pothole right near the bus stand causing traffic bottleneck)"
                className="w-full bg-white border border-[#3E000C]/15 rounded-xl p-3 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]/50 h-20 resize-none placeholder:text-[#3E000C]/45"
              />
            </div>

            {/* Manual Hazard Type Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-[#3E000C]/60 uppercase tracking-wider block">
                Hazard Classification
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  "Pothole",
                  "Broken Streetlight",
                  "Waterlogging",
                  "Open Manhole",
                  "Harassment Spot",
                  "Road Debris",
                ].map((typeStr) => (
                  <button
                    key={typeStr}
                    type="button"
                    onClick={() => setHazardType(typeStr)}
                    className={`p-2.5 rounded-xl text-xs font-medium border transition-colors text-left cursor-pointer ${
                      hazardType === typeStr
                        ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C] font-semibold"
                        : "bg-white text-[#3E000C] border-[#3E000C]/15 hover:border-[#3E000C]/35"
                    }`}
                  >
                    {typeStr}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Manual Override & Exposure Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-[#FFECD1]/20 p-4 rounded-2xl border border-[#3E000C]/12">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-[#3E000C]">
                  <span>Hazard Severity (Manual Selection)</span>
                  <span className="font-black text-sm">{severity} / 5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={severity}
                  onChange={(e) => handleManualSeverityChange(Number(e.target.value) as any)}
                  className="w-full accent-[#3E000C] cursor-pointer"
                />
                <p className="text-[11px] text-[#3E000C]/65">
                  {severity >= 4
                    ? "Severe: High danger of two-wheeler accidents."
                    : severity === 3
                    ? "Moderate: Commuters must brake/swerve."
                    : "Low: Superficial surface wear."}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-[#3E000C]">
                  <span>Daily Commuter Volume Proxy</span>
                  <span className="font-black text-sm">{exposureCount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={10000}
                  step={250}
                  value={exposureCount}
                  onChange={(e) => setExposureCount(Number(e.target.value))}
                  className="w-full accent-[#3E000C] cursor-pointer"
                />
                <p className="text-[11px] text-[#3E000C]/65">
                  Estimated based on street transit corridor classification
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#3E000C]/10">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setStep(3)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Review
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs"
          >
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#3E000C]">
                Step 3: Location Pin & Final Submission
              </h2>
              <p className="text-xs text-[#3E000C]/65 font-normal">
                Review GPS coordinates and calculated priority score before municipal dispatch.
              </p>
            </div>

            {/* Calculated Priority Score */}
            <div className="bg-[#FFECD1]/30 border border-[#3E000C]/15 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#3E000C]/60 uppercase tracking-wider block">
                  Exposure-Weighted Priority Score
                </span>
                <div className="text-2xl font-black text-[#3E000C] mt-0.5">
                  {priorityScore} <span className="text-xs font-normal text-[#3E000C]/60">pts</span>
                </div>
                <p className="text-[11px] text-[#3E000C]/65 mt-0.5">
                  Formula: (Severity {severity} × {exposureCount} Commuters) / 100
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#3E000C] text-[#FFECD1] text-xs font-semibold">
                Target SLA: {aiAnalysis?.recommendedSlaHours || 4} Hours
              </span>
            </div>

            {/* Dynamic Map */}
            <div className="h-56 rounded-2xl overflow-hidden border border-[#3E000C]/15 bg-white">
              <DynamicMap
                center={[coordinates.lat, coordinates.lng]}
                zoom={15}
                markers={[
                  {
                    lat: coordinates.lat,
                    lng: coordinates.lng,
                    title: title || hazardType,
                    type: hazardType,
                    severity,
                  },
                ]}
              />
            </div>

            {/* Dynamic AI Clarification Questions */}
            <div className="bg-[#FFECD1]/20 p-4 rounded-2xl border border-[#3E000C]/12 space-y-3">
              <span className="text-xs font-semibold text-[#3E000C] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#3E000C]" />
                Follow-up Clarification Prompts (Optional)
              </span>
              {clarifications.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-xs text-[#3E000C]/80">{item.question}</p>
                  <input
                    type="text"
                    placeholder="Enter answer or leave blank..."
                    value={item.answer || ""}
                    onChange={(e) => {
                      const updated = [...clarifications];
                      updated[idx].answer = e.target.value;
                      setClarifications(updated);
                    }}
                    className="w-full bg-white border border-[#3E000C]/15 rounded-xl px-3 py-1.5 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]/50"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-[#3E000C]/10">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setStep(2)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmitReport}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Submit Hazard Report
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
