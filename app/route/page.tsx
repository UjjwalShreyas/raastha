"use client";

import React, { useState, useEffect } from "react";
import {
  Navigation,
  ShieldCheck,
  Volume2,
  VolumeX,
  MapPin,
  Clock,
  ShieldAlert,
  ArrowRight,
  CheckCircle,
  Loader2,
  Zap,
  Info,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { DynamicMap } from "@/components/map/DynamicMap";
import { MOCK_DESTINATIONS, MOCK_BASE_COORDINATES } from "@/lib/mockData";
import { fetchOsrmRoute, ComputedRoute } from "@/lib/routingEngine";
import { Button } from "@/components/ui/Button";

export default function SafeRoutePage() {
  const { language, voice, triggerSOS, issues, coordinates, t } = useApp();

  const [selectedDestIndex, setSelectedDestIndex] = useState<number>(0);
  const [selectedRouteId, setSelectedRouteId] = useState<"fastest" | "safest">("safest");
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [audioNavigationMuted, setAudioNavigationMuted] = useState<boolean>(false);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState<boolean>(true);

  const [routes, setRoutes] = useState<{
    safest: ComputedRoute;
    fastest: ComputedRoute;
  } | null>(null);

  const destination = MOCK_DESTINATIONS[selectedDestIndex] || MOCK_DESTINATIONS[0];

  // Fetch live OSRM routes whenever destination or active hazards change
  useEffect(() => {
    let isCancelled = false;
    async function loadRoutes() {
      setIsLoadingRoutes(true);
      const startLat = coordinates.lat || MOCK_BASE_COORDINATES[0];
      const startLng = coordinates.lng || MOCK_BASE_COORDINATES[1];

      const computed = await fetchOsrmRoute(
        startLat,
        startLng,
        destination.coordinates[0],
        destination.coordinates[1],
        issues
      );

      if (!isCancelled) {
        setRoutes(computed);
        setIsLoadingRoutes(false);
      }
    }

    loadRoutes();
    return () => {
      isCancelled = true;
    };
  }, [selectedDestIndex, coordinates.lat, coordinates.lng, destination.coordinates, issues]);

  const activeRoute = routes ? routes[selectedRouteId] : null;
  const turnByTurnSteps = activeRoute?.turnByTurn || [
    { text: "Head east on Hitec City Main Road corridor", dist: "350m" },
    { text: "Continue straight along fully lit Madhapur 100 Feet Corridor", dist: "700m" },
    { text: "Arrive at destination safely", dist: "450m" },
  ];

  const handleStartNavigation = () => {
    setIsNavigating(true);
    setCurrentStepIndex(0);
    if (activeRoute) {
      const textToSpeak = `${t("navStart")} ${destination.name}. Safety score is ${activeRoute.safetyScore} out of 100.`;
      if (!audioNavigationMuted) {
        voice.speak(textToSpeak, language);
      }
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < turnByTurnSteps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      if (!audioNavigationMuted) {
        voice.speak(`In ${turnByTurnSteps[nextIdx].dist}, ${turnByTurnSteps[nextIdx].text}`, language);
      }
    } else {
      setIsNavigating(false);
      voice.speak(t("navArrived"), language);
    }
  };

  const mapPolylines = routes
    ? [
        {
          positions: routes.safest.coordinates,
          color: "#3E000C",
          name: `${routes.safest.name} (${routes.safest.duration})`,
          weight: selectedRouteId === "safest" ? 6 : 3,
        },
        {
          positions: routes.fastest.coordinates,
          color: "rgba(62, 0, 12, 0.45)",
          name: `${routes.fastest.name} (${routes.fastest.duration})`,
          weight: selectedRouteId === "fastest" ? 6 : 3,
          dashArray: "6, 6",
        },
      ]
    : [];

  const startMarker = {
    lat: coordinates.lat || MOCK_BASE_COORDINATES[0],
    lng: coordinates.lng || MOCK_BASE_COORDINATES[1],
    title: "Your GPS Location",
    type: "start",
  };

  const endMarker = {
    lat: destination.coordinates[0],
    lng: destination.coordinates[1],
    title: destination.name,
    type: "destination",
  };

  // Map hazard markers so user sees how route avoids them
  const hazardMarkers = issues.map((iss) => ({
    id: iss.id,
    lat: iss.location.lat,
    lng: iss.location.lng,
    title: iss.title,
    type: iss.type,
    severity: iss.severity,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3E000C]/12 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#3E000C] flex items-center gap-2.5">
            <Navigation className="w-6 h-6 text-[#3E000C]" />
            <span>Safe Corridor Navigation (Hyderabad)</span>
          </h1>
          <p className="text-[#3E000C]/65 text-xs mt-1">
            OSRM pathfinding re-ranked by streetlighting LUX levels and proximity to reported road hazards
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioNavigationMuted(!audioNavigationMuted)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#3E000C]/15 bg-[#FFFFFF]/80 text-xs text-[#3E000C] hover:bg-[#FFFFFF] cursor-pointer shadow-2xs"
          >
            {audioNavigationMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-[#3E000C]/50" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#3E000C]" />
                <span>Voice Guidance</span>
              </>
            )}
          </button>

          <button
            onClick={triggerSOS}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-900/30 bg-rose-900/10 text-rose-900 text-xs font-semibold hover:bg-rose-900/20 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SOS</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Destination Selector */}
          <div className="bg-[#FFFFFF]/80 border border-[#3E000C]/12 rounded-2xl p-4 space-y-2.5 shadow-2xs">
            <label className="text-[11px] font-bold text-[#3E000C]/60 uppercase tracking-wider block">
              Select Destination in Hyderabad
            </label>
            <div className="space-y-1.5">
              {MOCK_DESTINATIONS.map((dest, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDestIndex(idx)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    selectedDestIndex === idx
                      ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C] font-semibold"
                      : "bg-[#FFFFFF] text-[#3E000C] border-[#3E000C]/10 hover:border-[#3E000C]/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin
                      className={`w-4 h-4 shrink-0 ${
                        selectedDestIndex === idx ? "text-[#FFECD1]" : "text-[#3E000C]/60"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-medium">{dest.name}</div>
                      <div className="text-[10px] opacity-75">{dest.address}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      selectedDestIndex === idx
                        ? "bg-[#FFECD1]/15 border-[#FFECD1]/25 text-[#FFECD1]"
                        : "bg-[#3E000C]/5 border-[#3E000C]/10 text-[#3E000C]/70"
                    }`}
                  >
                    {dest.distance}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Route Options Comparison Cards */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-[#3E000C]/60 uppercase tracking-wider block">
                Calculated Route Alternatives
              </span>
              {isLoadingRoutes && (
                <span className="text-[10px] text-[#3E000C]/60 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Routing OSRM...
                </span>
              )}
            </div>

            {routes && (
              <>
                {/* 1. Safe Corridor Card */}
                <div
                  onClick={() => setSelectedRouteId("safest")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-colors shadow-2xs space-y-2 ${
                    selectedRouteId === "safest"
                      ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C]"
                      : "bg-[#FFFFFF]/80 border-[#3E000C]/12 text-[#3E000C] hover:border-[#3E000C]/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-bold text-sm">{routes.safest.name}</h3>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        selectedRouteId === "safest"
                          ? "bg-[#FFECD1]/20 text-[#FFECD1] border border-[#FFECD1]/30"
                          : "bg-emerald-900/15 text-emerald-900 border border-emerald-900/25"
                      }`}
                    >
                      Safety: {routes.safest.safetyScore}/100
                    </span>
                  </div>

                  <p className="text-xs opacity-80 leading-relaxed font-normal">
                    {routes.safest.description}
                  </p>

                  {/* Computed Reasons */}
                  <div className="space-y-1 pt-1">
                    {routes.safest.safetyReasons.map((reason, idx) => (
                      <div key={idx} className="text-[11px] flex items-center gap-1.5 opacity-90">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t border-current/15 text-xs font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 opacity-70" />
                      {routes.safest.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 opacity-70" />
                      {routes.safest.distance}
                    </span>
                  </div>
                </div>

                {/* 2. Fastest Shortcut Card */}
                <div
                  onClick={() => setSelectedRouteId("fastest")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-colors shadow-2xs space-y-2 ${
                    selectedRouteId === "fastest"
                      ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C]"
                      : "bg-[#FFFFFF]/80 border-[#3E000C]/12 text-[#3E000C] hover:border-[#3E000C]/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <h3 className="font-bold text-sm">{routes.fastest.name}</h3>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        selectedRouteId === "fastest"
                          ? "bg-[#FFECD1]/20 text-[#FFECD1] border border-[#FFECD1]/30"
                          : "bg-amber-900/15 text-amber-900 border border-amber-900/25"
                      }`}
                    >
                      Safety: {routes.fastest.safetyScore}/100
                    </span>
                  </div>

                  <p className="text-xs opacity-80 leading-relaxed font-normal">
                    {routes.fastest.description}
                  </p>

                  {/* Computed Reasons */}
                  <div className="space-y-1 pt-1">
                    {routes.fastest.safetyReasons.map((reason, idx) => (
                      <div key={idx} className="text-[11px] flex items-center gap-1.5 opacity-80">
                        <Info className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t border-current/15 text-xs font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 opacity-70" />
                      {routes.fastest.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 opacity-70" />
                      {routes.fastest.distance}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Navigation Action Button */}
          {!isNavigating ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full font-semibold"
              onClick={handleStartNavigation}
              leftIcon={<Navigation className="w-4 h-4 text-[#FFECD1]" />}
            >
              Start Safe Navigation
            </Button>
          ) : (
            <div className="bg-[#FFFFFF]/85 border border-[#3E000C]/15 rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#3E000C] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Live Navigation Active
                </span>
                <button
                  onClick={() => setIsNavigating(false)}
                  className="text-[11px] font-semibold text-[#3E000C]/60 hover:text-[#3E000C] cursor-pointer"
                >
                  End Trip
                </button>
              </div>

              {/* Turn-by-Turn step */}
              <div className="p-3 bg-[#FFECD1]/30 rounded-xl border border-[#3E000C]/10 space-y-1">
                <div className="text-[10px] font-bold text-[#3E000C]/60 uppercase tracking-wider">
                  Step {currentStepIndex + 1} of {turnByTurnSteps.length}
                </div>
                <div className="text-xs font-bold text-[#3E000C]">
                  {turnByTurnSteps[currentStepIndex]?.text}
                </div>
                <div className="text-[11px] text-[#3E000C]/70">
                  Distance: {turnByTurnSteps[currentStepIndex]?.dist}
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={handleNextStep}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {currentStepIndex === turnByTurnSteps.length - 1
                  ? "Arrived at Destination"
                  : "Next Step"}
              </Button>
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Map */}
        <div className="lg:col-span-7 h-[540px] rounded-3xl overflow-hidden border border-[#3E000C]/15 shadow-sm">
          <DynamicMap
            center={[coordinates.lat || MOCK_BASE_COORDINATES[0], coordinates.lng || MOCK_BASE_COORDINATES[1]]}
            zoom={14}
            markers={[startMarker, endMarker, ...hazardMarkers]}
            polylines={mapPolylines}
          />
        </div>
      </div>
    </div>
  );
}
