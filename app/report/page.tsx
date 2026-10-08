"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Info,
  Target,
  Cpu,
  ShieldCheck,
  Zap,
  MapPin,
  Navigation,
  Compass,
  Building2,
  Send,
  RefreshCw,
  Mail,
  Phone,
  ExternalLink,
  Radio,
  Check,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useIssues, IssueType } from "@/context/IssuesContext";
import { useLocation } from "@/context/LocationContext";
import { DynamicMap } from "@/components/map/DynamicMap";
import { Button } from "@/components/ui/Button";
import { useRecognition, speak } from "@/hooks/useSpeech";
import { analyzeHazard, HazardType } from "@/lib/analyzeHazard";
import { getNearestWard, GHMC_WARDS, getNearestAuthority, NearbyAuthority } from "@/lib/wards";
import { HazardDetectionOverlay } from "@/components/hazard/HazardDetectionOverlay";
import { BoundingBox } from "@/lib/roboflowClient";
import { processVoiceWithGemini } from "@/lib/ai/voiceAssistant";

// Self-contained embedded SVG images for presets (Zero CORS issues, Hyderabad themes)
const PRESET_IMAGES: {
  type: HazardType;
  title: string;
  dataUrl: string;
}[] = [
    {
      type: "pothole",
      title: "Deep Asphalt Pothole (~18cm cavity)",
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
        <text x="30" y="50" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="20">HITEC CITY - ROADWAY CAVITY</text>
        <text x="30" y="80" fill="#e74c3c" font-family="Helvetica, Arial, sans-serif" font-size="14">Estimated Severity: Cavity Risk | 2-Wheeler Hazard</text>
      </svg>
    `),
    },
    {
      type: "pothole",
      title: "Dual Roadway Potholes (Multi-Cavity Cluster)",
      dataUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="600" height="400" fill="#262629"/>
        <line x1="0" y1="200" x2="600" y2="200" stroke="#f1c40f" stroke-dasharray="30,25" stroke-width="6"/>
        <ellipse cx="200" cy="230" rx="90" ry="55" fill="#141416" stroke="#ff4d4f" stroke-width="3"/>
        <ellipse cx="195" cy="235" rx="65" ry="38" fill="#050507"/>
        <ellipse cx="440" cy="260" rx="110" ry="60" fill="#141416" stroke="#ff4d4f" stroke-width="3"/>
        <ellipse cx="435" cy="265" rx="80" ry="42" fill="#050507"/>
        <text x="30" y="50" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="20">MADHAPUR - DUAL POTHOLE CLUSTER</text>
        <text x="30" y="80" fill="#ff4d4f" font-family="Helvetica, Arial, sans-serif" font-size="14">Roboflow RF-DETR Multi-Target Localization</text>
      </svg>
    `),
    },
    {
      type: "streetlight",
      title: "Unlit Luminaire on Durgam Cheruvu Lane",
      dataUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="600" height="400" fill="#12131a"/>
        <line x1="280" y1="120" x2="280" y2="400" stroke="#3f4254" stroke-width="14"/>
        <path d="M280,130 C280,70 360,70 370,110" fill="none" stroke="#3f4254" stroke-width="10"/>
        <polygon points="350,110 390,110 400,140 340,140" fill="#232634" stroke="#ff4d4f" stroke-width="2"/>
        <line x1="360" y1="140" x2="350" y2="170" stroke="#ff4d4f" stroke-width="3" stroke-dasharray="4,4"/>
        <circle cx="370" cy="125" r="4" fill="#ff4d4f"/>
        <text x="30" y="50" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="20">DARK STRETCH - UNLIT STREETLIGHT</text>
        <text x="30" y="80" fill="#ffb84d" font-family="Helvetica, Arial, sans-serif" font-size="14">Pedestrian Risk: Zero Illumination</text>
      </svg>
    `),
    },
    {
      type: "other",
      title: "Open Drainage Chamber in Kondapur",
      dataUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="600" height="400" fill="#35363a"/>
        <circle cx="300" cy="220" r="85" fill="#050505" stroke="#ff3838" stroke-width="6"/>
        <circle cx="300" cy="220" r="70" fill="#000000"/>
        <circle cx="430" cy="200" r="75" fill="#222326" stroke="#718093" stroke-width="6" stroke-dasharray="10,5"/>
        <text x="30" y="50" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="20">OPEN DRAIN CHAMBER - HAZARD</text>
        <text x="30" y="80" fill="#ff3838" font-family="Helvetica, Arial, sans-serif" font-size="14">Uncovered Conduit Opening</text>
      </svg>
    `),
    },
  ];

function ReportWizardContent() {
  const router = useRouter();
  const { language, t, showToast } = useApp();
  const { citizen } = useAuth();
  const { addReportedIssue, isConfigured } = useIssues();
  const {
    coordinates,
    status: locationStatus,
    isReal,
    accuracy,
    error: locationError,
    formattedAddress,
    requestLocation,
    setCustomCoordinates,
  } = useLocation();

  const searchParams = useSearchParams();

  // Component-owned dictation recognizer (appends text to description and evaluates severity with Gemini)
  const dictation = useRecognition(language, {
    onFinal: async (text) => {
      const fullText = description ? `${description} ${text}` : text;
      setDescription(fullText);

      // Analyze problem severity & classification using Gemini AI
      if (fullText.trim().length >= 5) {
        try {
          const analysis = await processVoiceWithGemini(fullText, language);
          if (analysis.issueType) {
            setHazardType(analysis.issueType);
          }
          if (analysis.severityScore) {
            const mappedScore = Math.min(5, Math.max(1, Math.round(analysis.severityScore))) as 1 | 2 | 3 | 4 | 5;
            setSeverity(mappedScore);
          }
          if (analysis.severityReasoning) {
            setAiStatusMessage(
              `Gemini AI: ${analysis.severity?.toUpperCase()} (${analysis.severityScore}/5) - ${analysis.severityReasoning}`
            );
            setIsAiApplied(true);
          }
        } catch (err) {
          console.warn("Gemini voice severity analysis notice:", err);
        }
      }
    },
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isScanningPhoto, setIsScanningPhoto] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState<boolean>(false);

  // Engine selection
  const [selectedEngine, setSelectedEngine] = useState<"roboflow" | "gemini">("roboflow");
  const [aiDetections, setAiDetections] = useState<BoundingBox[]>([]);

  // AI & Manual State
  const [isAiApplied, setIsAiApplied] = useState<boolean>(false);
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);

  // Hazard fields
  const [hazardType, setHazardType] = useState<IssueType>("pothole");
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [needsFixing, setNeedsFixing] = useState<boolean>(true);
  const [description, setDescription] = useState<string>("");
  const [exposureCount, setExposureCount] = useState<number>(3500);
  const [ward, setWard] = useState<string>(() =>
    getNearestWard(coordinates.lat, coordinates.lng)
  );
  const [wardManuallyEdited, setWardManuallyEdited] = useState<boolean>(false);

  // Auto-located Nearby State Authority
  const [nearbyAuthority, setNearbyAuthority] = useState<NearbyAuthority>(() =>
    getNearestAuthority(coordinates.lat, coordinates.lng)
  );

  // Read pre-filled query params from voice commands (e.g. from Home or VoiceBar)
  useEffect(() => {
    if (!searchParams) return;
    const typeParam = searchParams.get("type");
    const severityParam = searchParams.get("severity");
    const descParam = searchParams.get("desc");

    if (typeParam && ["pothole", "streetlight", "garbage", "waterlogging", "other"].includes(typeParam)) {
      setHazardType(typeParam as IssueType);
      setIsAiApplied(true);
    }
    if (severityParam) {
      if (severityParam === "critical" || severityParam === "5") setSeverity(5);
      else if (severityParam === "high" || severityParam === "4") setSeverity(4);
      else if (severityParam === "medium" || severityParam === "3") setSeverity(3);
      else if (severityParam === "low" || severityParam === "1" || severityParam === "2") setSeverity(2);
      setIsAiApplied(true);
      setAiStatusMessage(`Gemini AI identified ${severityParam.toUpperCase()} priority problem`);
    }
    if (descParam) {
      setDescription(decodeURIComponent(descParam));
    }
  }, [searchParams]);

  // Submission success modal
  const [submissionModalData, setSubmissionModalData] = useState<{
    trackingId: string;
    authority: NearbyAuthority;
  } | null>(null);

  // Automatically derive nearest GHMC ward and State Authority from coordinates
  useEffect(() => {
    if (coordinates.lat && coordinates.lng) {
      const auth = getNearestAuthority(coordinates.lat, coordinates.lng);
      setNearbyAuthority(auth);
      if (!wardManuallyEdited) {
        setWard(getNearestWard(coordinates.lat, coordinates.lng));
      }
    }
  }, [coordinates.lat, coordinates.lng, wardManuallyEdited]);

  const handleRefreshGps = async () => {
    setIsRefreshingLocation(true);
    try {
      const coords = await requestLocation();
      const auth = getNearestAuthority(coords.lat, coords.lng);
      setNearbyAuthority(auth);
      showToast(`GPS pinpoint updated: ±${accuracy || 10}m accuracy`);
    } catch {
      showToast("Unable to fetch exact GPS. Using current pin.");
    } finally {
      setIsRefreshingLocation(false);
    }
  };

  // Dynamic follow-up questions from AI (empty if AI unavailable)
  const [clarifications, setClarifications] = useState<{ question: string; answer?: string }[]>([]);

  // Process uploaded user photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningPhoto(true);
    setAiStatusMessage(null);

    try {
      // Compress and analyze via client helper
      const { result, compressedFile, previewUrl } = await analyzeHazard(file, selectedEngine);
      setPhotoFile(compressedFile || file);
      setPhotoUrl(previewUrl);

      if (result.available) {
        if (result.isHazard) {
          setHazardType(result.type);
          setSeverity(result.severity as 1 | 2 | 3 | 4 | 5);
          setNeedsFixing(result.severity >= 3);
          setIsAiApplied(true);
          setIsManualOverride(false);
          setAiConfidence(result.confidence);
          setDescription(result.summary);
          setAiDetections(result.detections || []);

          if (result.followUpQuestions && result.followUpQuestions.length > 0) {
            setClarifications(
              result.followUpQuestions.slice(0, 2).map((q) => ({ question: q }))
            );
          } else {
            setClarifications([]);
          }

          if (result.imageQuality === "unclear") {
            setAiStatusMessage("Image quality was unclear. Please review the AI estimate below.");
          } else {
            setAiStatusMessage(result.summary);
          }
        } else {
          setIsAiApplied(false);
          setIsManualOverride(true);
          setAiConfidence(null);
          setAiDetections([]);
          setAiStatusMessage(
            "No civic hazard detected in photo. Please choose the category and severity manually if this is an active hazard."
          );
          setClarifications([]);
        }
      } else {
        // AI unavailable
        setIsAiApplied(false);
        setIsManualOverride(true);
        setAiConfidence(null);
        setAiDetections([]);
        setAiStatusMessage(
          result.reason || "AI analysis unavailable. Please select the hazard severity manually."
        );
        setClarifications([]);
      }
    } catch (err: any) {
      setIsAiApplied(false);
      setIsManualOverride(true);
      setAiConfidence(null);
      setAiDetections([]);
      setAiStatusMessage("Network issue calling vision service. Please select severity manually.");
      setClarifications([]);
    } finally {
      setIsScanningPhoto(false);
    }
  };

  // Process sample preset image
  const handleSelectPreset = async (preset: (typeof PRESET_IMAGES)[0]) => {
    setIsScanningPhoto(true);
    setAiStatusMessage(null);
    setPhotoUrl(preset.dataUrl);

    try {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, 600, 400);
          canvas.toBlob(
            async (blob) => {
              if (blob) {
                const syntheticFile = new File(
                  [blob],
                  `${preset.type}-sample.jpg`,
                  { type: "image/jpeg" }
                );
                const { result, compressedFile, previewUrl } = await analyzeHazard(
                  syntheticFile,
                  selectedEngine
                );
                setPhotoFile(compressedFile || syntheticFile);
                setPhotoUrl(previewUrl);

                if (result.available) {
                  if (result.isHazard) {
                    setHazardType(result.type);
                    setSeverity(result.severity as 1 | 2 | 3 | 4 | 5);
                    setNeedsFixing(result.severity >= 3);
                    setIsAiApplied(true);
                    setIsManualOverride(false);
                    setAiConfidence(result.confidence);
                    setDescription(result.summary);
                    setAiDetections(result.detections || []);

                    if (result.followUpQuestions && result.followUpQuestions.length > 0) {
                      setClarifications(
                        result.followUpQuestions.slice(0, 2).map((q) => ({ question: q }))
                      );
                    } else {
                      setClarifications([]);
                    }

                    if (result.imageQuality === "unclear") {
                      setAiStatusMessage("Image quality was unclear. Please review the AI estimate below.");
                    } else {
                      setAiStatusMessage(result.summary);
                    }
                  } else {
                    setIsAiApplied(false);
                    setIsManualOverride(true);
                    setAiConfidence(null);
                    setAiDetections([]);
                    setAiStatusMessage(
                      "No civic hazard detected in photo. Please choose the category and severity manually."
                    );
                    setClarifications([]);
                  }
                } else {
                  setIsAiApplied(false);
                  setIsManualOverride(true);
                  setAiConfidence(null);
                  setAiDetections([]);
                  setAiStatusMessage(
                    result.reason || "AI analysis unavailable. Please select severity manually."
                  );
                  setClarifications([]);
                }
              }
              setIsScanningPhoto(false);
            },
            "image/jpeg",
            0.9
          );
        } else {
          setIsScanningPhoto(false);
        }
      };
      img.onerror = () => setIsScanningPhoto(false);
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
    if (!photoFile && !photoUrl) {
      alert("A genuine photo of the hazard is strictly required before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const authDispatchTag = ` [Dispatched: ${nearbyAuthority.name}]`;
      const baseDesc = description?.trim() || `${hazardType} reported on ${ward}`;
      const createdRow = await addReportedIssue({
        type: hazardType,
        severity,
        severitySource: isManualOverride ? "manual" : "ai",
        description: `${baseDesc}${authDispatchTag}`,
        lat: coordinates.lat,
        lng: coordinates.lng,
        ward,
        photo: photoFile || (photoUrl as any),
        aiSummary: isAiApplied ? description : undefined,
        commuterEstimate: exposureCount,
      });

      const successMsg = `Hazard #${createdRow.tracking_id} reported & dispatched to ${nearbyAuthority.name}`;
      const spoke = speak(successMsg, language);
      if (!spoke) {
        showToast(successMsg);
      }

      setSubmissionModalData({
        trackingId: createdRow.tracking_id,
        authority: nearbyAuthority,
      });
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
            <span>Hazard Reporter & Roboflow AI Inspection</span>
          </h1>
          <p className="text-[#3E000C]/65 text-xs mt-1 font-normal">
            Upload or snap a road hazard photo to trigger Roboflow RF-DETR pothole localization and severity assessment.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${step === s
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

      {/* Citizen Session Status */}
      {citizen ? (
        <div className="bg-[#3E000C]/5 border border-[#3E000C]/15 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#3E000C]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Reporting as: <strong>{citizen.name}</strong> ({citizen.email})</span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider text-[#3E000C]/70 uppercase bg-[#3E000C]/10 px-2 py-0.5 rounded-md">
            Verified Citizen
          </span>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-amber-700" />
            <span>Reporting as Guest / Anonymous Citizen.</span>
          </div>
          <a
            href="/login"
            className="text-[11px] font-semibold text-[#3E000C] underline hover:text-[#3E000C]/80"
          >
            Sign In to track your ticket
          </a>
        </div>
      )}

      {/* Backend not configured banner */}
      {!isConfigured && (
        <div className="bg-amber-100/90 border border-amber-300 text-amber-900 rounded-2xl p-3.5 text-xs flex items-center gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-amber-700" />
          <span>
            <strong>Local Store Mode:</strong> Operating with instant local sync and mock database persistence.
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
                    Required
                  </span>
                </h2>
                <p className="text-xs text-[#3E000C]/65 font-normal">
                  Upload an authentic photo. The Roboflow RF-DETR model will localize the hazard and estimate severity.
                </p>
              </div>

              {photoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl(null);
                    setPhotoFile(null);
                    setIsAiApplied(false);
                    setAiStatusMessage(null);
                    setAiDetections([]);
                    setClarifications([]);
                  }}
                  className="text-xs font-semibold text-[#3E000C]/60 hover:text-[#3E000C] underline cursor-pointer"
                >
                  Clear Photo
                </button>
              )}
            </div>

            {/* Photo Upload Zone & Precision Bounding Box Overlay */}
            <div className="space-y-4">
              {!photoUrl ? (
                <label className="border-2 border-dashed border-[#3E000C]/25 hover:border-[#3E000C]/60 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-[#FFECD1]/15 transition-all text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#3E000C]/10 flex items-center justify-center text-[#3E000C]">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#3E000C] block">
                      Tap to Upload or Snap Camera Photo
                    </span>
                    <span className="text-xs text-[#3E000C]/60 mt-0.5 block">
                      JPEG, PNG, WebP (Automatically normalized and resized for high-precision detection)
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative w-full">
                  <HazardDetectionOverlay
                    photoUrl={photoUrl}
                    detections={aiDetections}
                    isScanning={isScanningPhoto}
                    engine={selectedEngine}
                  />

                  {/* Scanning Animation */}
                  {isScanningPhoto && (
                    <div className="absolute inset-0 bg-[#FFECD1]/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5 text-[#3E000C] rounded-2xl">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#3E000C]" />
                        <Target className="w-4 h-4 text-[#3E000C] absolute" />
                      </div>
                      <span className="text-xs font-bold tracking-tight">
                        {selectedEngine === "roboflow"
                          ? "Running Roboflow RF-DETR Model (safestreets logic)..."
                          : "Gemini AI is inspecting depth & severity score..."}
                      </span>
                      <span className="text-[11px] text-[#3E000C]/70">
                        {selectedEngine === "roboflow"
                          ? "Localizing cavity coordinates & bounding boxes"
                          : "Evaluating commuter hazard risk and municipal repair timeline"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Privacy & Safety Note */}
            <div className="text-[11px] text-[#3E000C]/75 bg-[#FFECD1]/35 border border-[#3E000C]/15 rounded-xl px-3.5 py-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3E000C] shrink-0" />
              <span>
                <strong>Privacy Notice:</strong> Faces and number plates should be blurred before sharing. Photos are processed purely for road safety defect inspection.
              </span>
            </div>

            {/* Assessment & Severity Verdict Card */}
            <div className="bg-[#FFECD1]/35 border border-[#3E000C]/15 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#3E000C]/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#3E000C]" />
                  <span className="text-xs font-bold text-[#3E000C] uppercase tracking-wider">
                    Severity Assessment
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#3E000C]/8 text-[#3E000C] border border-[#3E000C]/12">
                  {isAiApplied && !isManualOverride
                    ? `AI estimate${aiConfidence !== null ? ` (conf: ${Math.round(aiConfidence * 100)}%)` : ""}`
                    : "Manual selection"}
                </span>
              </div>

              {/* Status Message */}
              {aiStatusMessage && (
                <div className="text-xs text-[#3E000C]/85 bg-white p-3 rounded-xl border border-[#3E000C]/10 flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#3E000C] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{aiStatusMessage}</span>
                </div>
              )}

              {/* 90% Confidence Gate Indicator */}
              {aiConfidence !== null && (
                <div>
                  {aiConfidence >= 0.9 ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold shadow-2xs">
                      <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        AI Confidence: <strong>{Math.round(aiConfidence * 100)}%</strong> (Verified &ge; 90% threshold &bull; Ready to proceed to Step 2)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-300 text-rose-950 rounded-xl text-xs shadow-2xs">
                      <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold text-rose-900">
                          Detection Confidence Low ({Math.round(aiConfidence * 100)}% &lt; 90%)
                        </div>
                        <p className="text-rose-800/90 leading-relaxed">
                          Raastha requires at least <strong>90% AI confidence</strong> before proceeding to Step 2 (Voice Dictation &amp; Classification). Please upload or take a clearer, closer photo of the road hazard.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Severity Gauge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-[#3E000C]/12 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#3E000C]/75">Severity Rating</span>
                    <span className="text-base font-black text-[#3E000C]">{severity} / 5</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 h-3">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        className={`rounded-sm transition-all duration-300 ${lvl <= severity
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
                    {severity === 1 && "Level 1: Minor hairline crack / superficial wear"}
                    {severity === 2 && "Level 2: Shallow depression with minimal commuter risk"}
                    {severity === 3 && "Level 3: Moderate defect (vehicles must brake/swerve)"}
                    {severity === 4 && "Level 4: Deep cavity / dark stretch (two-wheeler risk)"}
                    {severity === 5 && "Level 5: Critical cavern / fully dark junction (urgent safety)"}
                  </div>
                </div>

                {/* Repair Verdict */}
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
                      Repair Priority
                    </div>
                    <div
                      className={`text-sm font-black ${needsFixing ? "text-[#3E000C]" : "text-emerald-800"
                        }`}
                    >
                      {needsFixing ? "Needs Dispatch / Action" : "Low Urgency"}
                    </div>
                    <p className="text-[11px] text-[#3E000C]/75 leading-tight">
                      {needsFixing
                        ? "Warrants prompt municipal response based on commuter risk."
                        : "Low danger to commuters; logged for routine road maintenance."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual Severity Override Buttons */}
              <div className="pt-2 border-t border-[#3E000C]/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3E000C] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#3E000C]" />
                    <span>Choose / Override Severity Rating:</span>
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
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${severity === s
                        ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C] shadow-2xs"
                        : "bg-white text-[#3E000C] border-[#3E000C]/15 hover:border-[#3E000C]/40"
                        }`}
                    >
                      <div>Level {s}</div>
                      <div className="text-[9px] font-normal opacity-80 mt-0.5">
                        {s >= 3 ? "Action" : "Minor"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Test Samples */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-[#3E000C]/60 uppercase tracking-wider block">
                Or click a sample hazard photo to test detection:
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
                      <span className="text-[11px] font-bold text-[#FFECD1] line-clamp-1 capitalize">
                        {preset.title.split("(")[0]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1 Continue Action */}
            <div className="pt-4 border-t border-[#3E000C]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs">
                {aiConfidence !== null && aiConfidence < 0.9 ? (
                  <span className="text-rose-900 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                    <span>Cannot proceed: AI confidence ({Math.round(aiConfidence * 100)}%) is below 90% threshold.</span>
                  </span>
                ) : aiConfidence !== null && aiConfidence >= 0.9 ? (
                  <span className="text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Confidence verified ({Math.round(aiConfidence * 100)}% &ge; 90%). Ready for Step 2.</span>
                  </span>
                ) : (
                  <span className="text-[#3E000C]/60 text-[11px]">
                    * Upload a clear photo to achieve &ge; 90% AI confidence before advancing.
                  </span>
                )}
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (!photoUrl) {
                    alert("Please select or snap a hazard photo to proceed.");
                    return;
                  }
                  if (aiConfidence !== null && aiConfidence < 0.9) {
                    showToast(`AI detection confidence is ${Math.round(aiConfidence * 100)}%. Minimum 90% confidence required to proceed.`);
                    return;
                  }
                  setStep(2);
                }}
                disabled={!photoUrl || isScanningPhoto || (aiConfidence !== null && aiConfidence < 0.9)}
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
                Step 2: Voice Dictation & Classification
              </h2>
              <p className="text-xs text-[#3E000C]/65 font-normal">
                Dictate additional context or landmark details in {language}.
              </p>
            </div>

            {/* Voice Dictation (Dictation mode only appends text to description and never navigates) */}
            <div className="bg-[#FFECD1]/20 p-4 rounded-2xl border border-[#3E000C]/12 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#3E000C] flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#3E000C] animate-pulse" />
                  Voice Dictation ({language})
                </span>
                <Button
                  variant={dictation.listening ? "danger" : dictation.isProcessing ? "primary" : "secondary"}
                  size="sm"
                  disabled={dictation.isProcessing}
                  onClick={() => {
                    if (dictation.listening) {
                      dictation.stop();
                    } else {
                      dictation.start();
                    }
                  }}
                >
                  {dictation.listening
                    ? "Stop Dictation"
                    : dictation.isProcessing
                      ? "Vosk Processing..."
                      : "Tap to Speak"}
                </Button>
              </div>

              {dictation.error && (
                <p className="text-xs text-red-700 bg-red-100/80 p-2 rounded-xl">
                  {dictation.error}
                </p>
              )}

              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
                placeholder="Speak or type hazard details... (e.g. Deep pothole right near the bus stand causing traffic bottleneck)"
                className="w-full bg-white border border-[#3E000C]/15 rounded-xl p-3 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]/50 h-20 resize-none placeholder:text-[#3E000C]/45"
              />
            </div>

            {/* Manual Hazard Type Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-[#3E000C]/60 uppercase tracking-wider block">
                Hazard Classification {isAiApplied && !isManualOverride ? "(AI estimate)" : "(Manual)"}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(
                  [
                    { id: "pothole", label: "Pothole" },
                    { id: "streetlight", label: "Broken Streetlight" },
                    { id: "waterlogging", label: "Waterlogging" },
                    { id: "garbage", label: "Road Debris / Garbage" },
                    { id: "other", label: "Other Hazard" },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setHazardType(cat.id);
                      setIsManualOverride(true);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${hazardType === cat.id
                      ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C] shadow-2xs"
                      : "bg-white text-[#3E000C] border-[#3E000C]/15 hover:border-[#3E000C]/40"
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Commuter Volume Proxy Slider */}
            <div className="bg-[#FFECD1]/20 p-4 rounded-2xl border border-[#3E000C]/12 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#3E000C]">
                  Estimated Daily Commuter Volume (Proxy):
                </span>
                <span className="font-mono font-black text-[#3E000C]">
                  {exposureCount.toLocaleString()} commuters / day
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="10000"
                step="500"
                value={exposureCount}
                onChange={(e) => setExposureCount(Number(e.target.value))}
                className="w-full accent-[#3E000C] cursor-pointer"
              />
              <p className="text-[11px] text-[#3E000C]/65">
                Estimated based on street transit corridor classification
              </p>
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
                Review GPS coordinates, auto-assigned State Authority dispatch, and priority score.
              </p>
            </div>

            {/* GPS Live Coordinates & Recalibration Bar */}
            <div className="bg-[#3E000C]/5 border border-[#3E000C]/15 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isReal ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <span className="text-xs font-bold text-[#3E000C]">
                    {isReal ? "Live GPS Coordinates Locked" : "Default / Pinned Location"}
                  </span>
                  {accuracy && (
                    <span className="text-[10px] bg-[#3E000C]/10 text-[#3E000C] font-semibold px-2 py-0.5 rounded-md">
                      ±{accuracy}m accuracy
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleRefreshGps}
                  disabled={isRefreshingLocation}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#3E000C]/20 hover:border-[#3E000C]/40 rounded-xl text-xs font-semibold text-[#3E000C] cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLocation ? "animate-spin text-[#3E000C]" : "text-[#3E000C]"}`} />
                  <span>{isRefreshingLocation ? "Locating..." : "Recalibrate GPS"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-white/80 border border-[#3E000C]/10 rounded-xl p-2.5 flex items-center justify-between font-mono">
                  <span className="text-[#3E000C]/60 text-[11px]">Latitude:</span>
                  <span className="font-bold text-[#3E000C]">{coordinates.lat.toFixed(6)}° N</span>
                </div>
                <div className="bg-white/80 border border-[#3E000C]/10 rounded-xl p-2.5 flex items-center justify-between font-mono">
                  <span className="text-[#3E000C]/60 text-[11px]">Longitude:</span>
                  <span className="font-bold text-[#3E000C]">{coordinates.lng.toFixed(6)}° E</span>
                </div>
              </div>
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
                Source: {isManualOverride ? "Manual" : "AI Estimate"}
              </span>
            </div>

            {/* Dynamic Map */}
            <div className="h-56 rounded-2xl overflow-hidden border border-[#3E000C]/15 bg-white relative">
              <DynamicMap
                center={[coordinates.lat, coordinates.lng]}
                zoom={15}
                markers={[
                  {
                    lat: coordinates.lat,
                    lng: coordinates.lng,
                    title: description || hazardType,
                    type: hazardType,
                    severity,
                  },
                ]}
              />
              <div className="absolute bottom-2 left-2 z-1000 bg-white/95 backdrop-blur-xs border border-[#3E000C]/15 rounded-lg px-2.5 py-1 text-[10px] text-[#3E000C] font-semibold flex items-center gap-1.5 shadow-xs">
                <MapPin className="w-3 h-3 text-[#3E000C]" />
                <span>Hazard Pin: {ward}</span>
              </div>
            </div>

            {/* Auto-Located Nearby State Authority Dispatch Card */}
            <div className="bg-gradient-to-br from-[#3E000C]/5 via-[#FFECD1]/25 to-[#3E000C]/5 border border-[#3E000C]/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#3E000C]">
                  <Building2 className="w-4 h-4 text-[#3E000C]" />
                  <span>Auto-Assigned State / Municipal Authority</span>
                </div>
                <span className="text-[10px] font-bold bg-[#3E000C] text-[#FFECD1] px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#FFECD1]" />
                  {nearbyAuthority.distanceKm ?? 1.2} km away
                </span>
              </div>

              <div className="bg-white/90 rounded-xl p-3.5 border border-[#3E000C]/12 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#3E000C]">{nearbyAuthority.name}</h3>
                    <p className="text-xs text-[#3E000C]/75 font-medium">{nearbyAuthority.department}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#3E000C]/10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-[#3E000C]/60 uppercase tracking-wider block">Higher Official In Charge</span>
                    <span className="font-bold text-[#3E000C]">{nearbyAuthority.officialRole}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#3E000C]/60 uppercase tracking-wider block">Official Dispatch Desk</span>
                    <span className="font-mono text-[11px] text-[#3E000C]">{nearbyAuthority.nodalEmail}</span>
                  </div>
                </div>
              </div>


            </div>

            {/* GHMC Ward Selector (Auto-derived from coordinates with user override) */}
            <div className="bg-[#FFECD1]/20 p-4 rounded-2xl border border-[#3E000C]/12 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#3E000C] block">
                  {t("wardSelectLabel")}
                </label>
                <span className="text-[10px] text-[#3E000C]/65">
                  {wardManuallyEdited ? "Custom selection" : t("wardAutoDetected")}
                </span>
              </div>
              <select
                value={ward}
                onChange={(e) => {
                  setWard(e.target.value);
                  setWardManuallyEdited(true);
                }}
                className="w-full bg-white border border-[#3E000C]/15 rounded-xl px-3 py-2 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]/50 font-medium cursor-pointer shadow-2xs"
              >
                {GHMC_WARDS.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name} ({w.locality})
                  </option>
                ))}
              </select>
            </div>

            {/* Follow-up Questions (Rendered only when generated by AI, skipped if AI is unavailable) */}
            {clarifications.length > 0 && (
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
            )}

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
                disabled={isSubmitting}
                onClick={handleSubmitReport}
                rightIcon={
                  isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )
                }
              >
                {isSubmitting ? "Dispatching to State Authority..." : "Submit & Dispatch to Authority"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submission & State Authority Dispatch Confirmation Modal */}
      {submissionModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-[#3E000C]/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#3E000C]">Report Dispatched Successfully</h3>
                <p className="text-xs text-[#3E000C]/70">
                  Tracking ID: <strong className="font-mono text-[#3E000C]">{submissionModalData.trackingId}</strong>
                </p>
              </div>
            </div>

            <div className="bg-[#FFECD1]/30 border border-[#3E000C]/15 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-[#3E000C] font-bold">
                <Building2 className="w-4 h-4 text-[#3E000C]" />
                <span>Transmitted to State Authority:</span>
              </div>
              <div className="pl-6 space-y-1">
                <p className="font-bold text-[#3E000C]">{submissionModalData.authority.name}</p>
                <p className="text-[#3E000C]/75">{submissionModalData.authority.officialRole}</p>
                <p className="text-[11px] font-mono text-[#3E000C]/60">{submissionModalData.authority.nodalEmail}</p>
              </div>
              <div className="pt-2 border-t border-[#3E000C]/10 text-[11px] text-emerald-800 flex items-center gap-1.5 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gemini AI Visual Diagnostic Assessment & Priority Score attached to ticket.</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => {
                  setSubmissionModalData(null);
                  router.push("/");
                }}
              >
                Return Home
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                onClick={() => {
                  setSubmissionModalData(null);
                  router.push("/my-reports");
                }}
              >
                Track My Reports
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function ReportWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4 font-sans">
          <Loader2 className="w-8 h-8 animate-spin text-[#3E000C]" />
          <p className="text-xs text-[#3E000C]/70">Loading Hazard Reporter...</p>
        </div>
      }
    >
      <ReportWizardContent />
    </Suspense>
  );
}
