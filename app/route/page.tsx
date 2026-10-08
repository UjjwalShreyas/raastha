"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { DynamicMap } from "@/components/map/DynamicMap";
import { MOCK_ROUTES, MOCK_DESTINATIONS, MOCK_BASE_COORDINATES } from "@/lib/mockData";
import { Button } from "@/components/ui/Button";

export default function SafeRoutePage() {
  const { t, language, voice, triggerSOS } = useApp();
  const { coordinates } = useGeolocation();

  const [selectedDestination, setSelectedDestination] = useState<string>(MOCK_DESTINATIONS[0].name);
  const [selectedRouteId, setSelectedRouteId] = useState<"fastest" | "safest">("safest");
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [audioNavigationMuted, setAudioNavigationMuted] = useState<boolean>(false);

  const activeRoute = MOCK_ROUTES.find((r) => r.id === selectedRouteId) || MOCK_ROUTES[1];

  const turnByTurnSteps = [
    { text: "Head east on 80 Feet Road towards Koramangala 4th Block", dist: "300m" },
    { text: "Turn right onto 100 Feet Lit Corridor (100% Streetlight Illumination)", dist: "600m" },
    { text: "Continue straight past Police Patrol Kiosk (CCTV Monitored Zone)", dist: "800m" },
    { text: "Slight left towards Indiranagar Metro Station Destination", dist: "400m" },
  ];

  const handleStartNavigation = () => {
    setIsNavigating(true);
    setCurrentStepIndex(0);
    const textToSpeak = `Starting safe corridor navigation to ${selectedDestination}. ${activeRoute.description}`;
    if (!audioNavigationMuted) {
      voice.speak(textToSpeak, language);
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
      voice.speak("You have arrived at your destination via the safe corridor!", language);
    }
  };

  const mapPolylines = MOCK_ROUTES.map((route) => ({
    positions: route.coordinates,
    color: route.id === "safest" ? "#3E000C" : "rgba(62, 0, 12, 0.45)",
    name: `${route.name} (${route.duration})`,
    weight: route.id === selectedRouteId ? 6 : 3,
    dashArray: route.id === "fastest" ? "6, 6" : undefined,
  }));

  const startMarker = {
    lat: MOCK_BASE_COORDINATES[0],
    lng: MOCK_BASE_COORDINATES[1],
    title: "Your Location",
    type: "start",
  };

  const endMarker = {
    lat: 12.943,
    lng: 77.6285,
    title: selectedDestination,
    type: "destination",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3E000C]/12 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#3E000C] flex items-center gap-2.5">
            <Navigation className="w-6 h-6 text-[#3E000C]" />
            <span>Safe Corridor Navigation</span>
          </h1>
          <p className="text-[#3E000C]/65 text-xs mt-1">
            Real-time route optimization factoring streetlighting LUX levels and verified CCTV zones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioNavigationMuted(!audioNavigationMuted)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3E000C]/15 bg-[#FFFFFF]/80 text-xs text-[#3E000C] hover:bg-[#FFFFFF] cursor-pointer shadow-2xs"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-900/30 bg-rose-900/10 text-rose-900 text-xs font-semibold hover:bg-rose-900/20 cursor-pointer"
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
            <label className="text-[11px] font-medium text-[#3E000C]/60 uppercase tracking-wider block">
              Destination
            </label>
            <div className="space-y-1.5">
              {MOCK_DESTINATIONS.map((dest, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDestination(dest.name)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    selectedDestination === dest.name
                      ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C] font-semibold"
                      : "bg-[#FFFFFF] text-[#3E000C] border-[#3E000C]/10 hover:border-[#3E000C]/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin
                      className={`w-4 h-4 shrink-0 ${
                        selectedDestination === dest.name ? "text-[#FFECD1]" : "text-[#3E000C]/60"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-medium">{dest.name}</div>
                      <div className="text-[10px] opacity-75">{dest.address}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      selectedDestination === dest.name
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
            <span className="text-[11px] font-medium text-[#3E000C]/60 uppercase tracking-wider block">
              Route Options
            </span>

            {MOCK_ROUTES.map((route) => {
              const isSelected = selectedRouteId === route.id;
              const isSafest = route.id === "safest";

              return (
                <div
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-colors shadow-2xs ${
                    isSelected
                      ? isSafest
                        ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C]"
                        : "bg-[#3E000C]/90 text-[#FFECD1] border-[#3E000C]"
                      : "bg-[#FFFFFF]/80 border-[#3E000C]/12 text-[#3E000C] hover:border-[#3E000C]/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSelected ? "bg-[#FFECD1]" : "bg-[#3E000C]"
                        }`}
                      />
                      <h3 className="font-semibold text-sm">{route.name}</h3>
                      {isSafest && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isSelected
                              ? "bg-[#FFECD1] text-[#3E000C]"
                              : "bg-[#3E000C] text-[#FFECD1]"
                          }`}
                        >
                          Safest
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold">{route.duration}</div>
                      <div className="text-[10px] opacity-75">{route.distance}</div>
                    </div>
                  </div>

                  {/* Safety Rating Bar */}
                  <div className="mt-3 pt-2.5 border-t border-current/15 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="opacity-75">Safety Index</span>
                      <span className="font-bold">{route.safetyScore} / 100</span>
                    </div>

                    <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isSelected ? "bg-[#FFECD1]" : "bg-[#3E000C]"
                        }`}
                        style={{ width: `${route.safetyScore}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] opacity-75 pt-0.5">
                      <div>Lighting: <span className="font-semibold">{route.lightingQuality}</span></div>
                      <div>CCTV: <span className="font-semibold">{route.cctvCoverage}</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Turn-by-Turn Guidance */}
          {isNavigating ? (
            <div className="bg-[#3E000C] text-[#FFECD1] border border-[#3E000C] rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 animate-spin" />
                  Active Navigation
                </span>
                <span>Step {currentStepIndex + 1} of {turnByTurnSteps.length}</span>
              </div>

              <div className="bg-[#FFECD1]/10 p-3 rounded-xl border border-[#FFECD1]/20 space-y-1">
                <div className="text-[10px] text-[#FFECD1]/80 font-medium">
                  Next Maneuver ({turnByTurnSteps[currentStepIndex].dist})
                </div>
                <div className="text-xs font-medium text-[#FFECD1] leading-snug">
                  {turnByTurnSteps[currentStepIndex].text}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1 bg-[#FFECD1] text-[#3E000C] hover:bg-[#FFE5BF]"
                  onClick={handleNextStep}
                >
                  {currentStepIndex === turnByTurnSteps.length - 1 ? "Complete" : "Next Step"}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="bg-[#FFECD1]/10 text-[#FFECD1] border-[#FFECD1]/25 hover:bg-[#FFECD1]/20"
                  onClick={() => setIsNavigating(false)}
                >
                  Exit
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartNavigation}
              className="w-full"
              leftIcon={<Navigation className="w-4 h-4 text-[#FFECD1]" />}
            >
              {t("startNavigation")}
            </Button>
          )}
        </div>

        {/* Right Column: Dynamic Map (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="h-[520px] rounded-2xl overflow-hidden border border-[#3E000C]/15 shadow-sm bg-white">
            <DynamicMap
              center={MOCK_BASE_COORDINATES}
              zoom={14}
              polylines={mapPolylines}
              markers={[startMarker, endMarker]}
            />
          </div>

          <div className="bg-[#FFFFFF]/80 border border-[#3E000C]/12 rounded-xl p-3 flex items-center justify-between text-xs text-[#3E000C]/75 shadow-2xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3E000C]" />
                <span className="text-[#3E000C] font-semibold">Safest Corridor</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3E000C]/40" />
                <span className="text-[#3E000C]/60">Alternative Route</span>
              </span>
            </div>
            <span className="text-[11px] text-[#3E000C]/50">Sensor verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
