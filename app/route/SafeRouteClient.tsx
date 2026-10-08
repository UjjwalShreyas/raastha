"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Search,
  X,
  AlertTriangle,
  Car,
  Footprints,
  LocateFixed,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useIssues } from "@/context/IssuesContext";
import { useLocation } from "@/context/LocationContext";
import { DynamicMap } from "@/components/map/DynamicMap";
import { Button } from "@/components/ui/Button";
import { speak } from "@/hooks/useSpeech";
import { rankAndRecommendRoutes, RankedRoute, RouteCandidate } from "@/lib/safety";

interface DestinationItem {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// Popular Hyderabad civic landmarks for instant 1-click exploration
const QUICK_HYDERABAD_DESTINATIONS: DestinationItem[] = [
  {
    name: "Charminar & Old City",
    address: "Pathergatti, Hyderabad",
    lat: 17.3616,
    lng: 78.4747,
  },
  {
    name: "Cyber Towers, Hitec City",
    address: "Hitec City Main Road, Madhapur",
    lat: 17.4504,
    lng: 78.3808,
  },
  {
    name: "Secunderabad Railway Station",
    address: "Station Road, Secunderabad",
    lat: 17.4344,
    lng: 78.5017,
  },
  {
    name: "Banjara Hills Road No. 1",
    address: "Banjara Hills, Hyderabad",
    lat: 17.4156,
    lng: 78.4354,
  },
  {
    name: "Gachibowli Stadium",
    address: "Old Mumbai Highway, Gachibowli",
    lat: 17.4474,
    lng: 78.3489,
  },
];

export default function SafeRouteClient() {
  const { language, triggerSOS, t, showToast } = useApp();
  const { issues } = useIssues();
  const { coordinates, requestLocation, isReal } = useLocation();

  // Mode: driving or walking
  const [profile, setProfile] = useState<"driving-car" | "foot-walking">("driving-car");

  // Destination selection state
  const [destination, setDestination] = useState<DestinationItem>(
    QUICK_HYDERABAD_DESTINATIONS[1] // Default: Cyber Towers
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<DestinationItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Routes state
  const [routes, setRoutes] = useState<RankedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [isLoadingRoutes, setIsLoadingRoutes] = useState<boolean>(true);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);

  // Turn-by-turn navigation state
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [audioNavigationMuted, setAudioNavigationMuted] = useState<boolean>(false);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Handle destination geocoding search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsDropdownOpen(true);

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
        const json = await res.json();
        if (Array.isArray(json?.results)) {
          setSearchResults(json.results);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelectDestination = (dest: DestinationItem) => {
    setDestination(dest);
    setSearchQuery("");
    setIsDropdownOpen(false);
    setSearchResults([]);
  };

  // Fetch real routes from OpenRouteService server endpoint
  const fetchRoutes = useCallback(async () => {
    setIsLoadingRoutes(true);
    setRoutingError(null);
    setIsFallback(false);

    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: { lat: coordinates.lat, lng: coordinates.lng },
          end: { lat: destination.lat, lng: destination.lng },
          profile,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.routes || data.routes.length === 0) {
        setRoutingError(data.error || "Could not retrieve route alternatives.");
        setIsFallback(true);
      }

      if (data.isStraightLineFallback || !data.available) {
        setIsFallback(true);
        if (data.error) setRoutingError(data.error);
      }

      const rawCandidates: RouteCandidate[] = (data.routes || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        coordinates: r.coordinates,
        distanceMeters: r.distanceMeters,
        durationSeconds: r.durationSeconds,
        instructions: r.instructions || [],
        isStraightLineFallback: r.isStraightLineFallback || false,
      }));

      // Evaluate and rank routes using safety scoring engine
      const ranked = rankAndRecommendRoutes(rawCandidates, issues);
      setRoutes(ranked);

      if (ranked.length > 0) {
        // Select the recommended route by default
        const rec = ranked.find((r) => r.isRecommended) || ranked[0];
        setSelectedRouteId(rec.id);
      }
    } catch (err: any) {
      setRoutingError(err?.message || "Network error loading route.");
      setIsFallback(true);
      setRoutes([]);
    } finally {
      setIsLoadingRoutes(false);
    }
  }, [coordinates.lat, coordinates.lng, destination.lat, destination.lng, profile, issues]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0] || null;
  const turnByTurnSteps = activeRoute?.instructions || [];

  const handleStartNavigation = () => {
    setIsNavigating(true);
    setCurrentStepIndex(0);
    if (activeRoute) {
      const textToSpeak = `${t("navStart")} ${destination.name}`;
      if (!audioNavigationMuted) {
        const spoke = speak(textToSpeak, language);
        if (!spoke) showToast(textToSpeak);
      }
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < turnByTurnSteps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      if (!audioNavigationMuted) {
        const step = turnByTurnSteps[nextIdx];
        const stepText = `In ${step.dist}, ${step.text}`;
        const spoke = speak(stepText, language);
        if (!spoke) showToast(`${step.dist}: ${step.text}`);
      }
    } else {
      setIsNavigating(false);
      const arriveText = t("navArrived");
      const spoke = speak(arriveText, language);
      if (!spoke) showToast(arriveText);
    }
  };

  // Build Leaflet polylines for all alternative routes
  const mapPolylines = routes.map((r) => {
    const isSelected = r.id === selectedRouteId;
    return {
      positions: r.coordinates,
      color: isSelected ? "#3E000C" : "rgba(62, 0, 12, 0.45)",
      name: `${r.name} (${(r.distanceMeters / 1000).toFixed(1)} km, Safety: ${r.safety.safetyScore}/100)`,
      weight: isSelected ? 6 : 3,
      dashArray: r.isStraightLineFallback ? "6, 6" : isSelected ? undefined : "6, 6",
    };
  });

  const startMarker = {
    lat: coordinates.lat,
    lng: coordinates.lng,
    title: isReal ? "Your GPS Location" : "Hyderabad City Center (GPS fallback)",
    type: "start",
  };

  const endMarker = {
    lat: destination.lat,
    lng: destination.lng,
    title: destination.name,
    type: "destination",
  };

  const hazardMarkers = issues
    .filter((i) => i.status !== "resolved" && i.status !== "rejected")
    .map((iss) => ({
      id: iss.id,
      lat: iss.lat,
      lng: iss.lng,
      title: iss.description || `${iss.type} on ${iss.ward}`,
      type: iss.type,
      severity: iss.severity,
    }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3E000C]/12 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#3E000C]/8 border border-[#3E000C]/15 text-[#3E000C] text-xs font-bold mb-1.5">
            <Navigation className="w-3.5 h-3.5" />
            <span>OpenRouteService Corridor Pathfinding</span>
          </div>
          <h1 className="text-2xl font-bold text-[#3E000C] tracking-tight">
            {t("navIlluminatedCorridor")}
          </h1>
          <p className="text-[#3E000C]/65 text-xs mt-0.5">
            Real multi-route pathfinding re-ranked by hazard proximity and streetlighting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex items-center bg-white border border-[#3E000C]/15 rounded-xl p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setProfile("driving-car")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                profile === "driving-car"
                  ? "bg-[#3E000C] text-[#FFECD1]"
                  : "text-[#3E000C]/70 hover:text-[#3E000C]"
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>{t("drivingProfile")}</span>
            </button>
            <button
              type="button"
              onClick={() => setProfile("foot-walking")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                profile === "foot-walking"
                  ? "bg-[#3E000C] text-[#FFECD1]"
                  : "text-[#3E000C]/70 hover:text-[#3E000C]"
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>{t("walkingProfile")}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAudioNavigationMuted(!audioNavigationMuted)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#3E000C]/15 bg-[#FFFFFF]/80 text-xs text-[#3E000C] hover:bg-[#FFFFFF] cursor-pointer shadow-2xs"
          >
            {audioNavigationMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-[#3E000C]/50" />
                <span>{t("muted")}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#3E000C]" />
                <span>{t("voiceGuidance")}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={triggerSOS}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-900/30 bg-rose-900/10 text-rose-900 text-xs font-semibold hover:bg-rose-900/20 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SOS</span>
          </button>
        </div>
      </div>

      {/* Visible Error / Fallback Notice */}
      {routingError && (
        <div
          role="alert"
          className="bg-amber-100/90 border border-amber-300 text-amber-950 rounded-2xl p-4 text-xs space-y-1 shadow-2xs"
        >
          <div className="font-bold flex items-center gap-2 text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t("orsUnavailableNotice")}</span>
          </div>
          <p className="text-amber-900/90">{routingError}</p>
          {isFallback && (
            <p className="text-[11px] font-semibold text-amber-950 mt-1">
              {t("straightLineFallbackNotice")}
            </p>
          )}
        </div>
      )}

      {/* Main Grid: Selector & Routes on Left, Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Origin info & Destination Search Box */}
          <div className="bg-[#FFFFFF]/90 border border-[#3E000C]/12 rounded-2xl p-4 space-y-3.5 shadow-2xs">
            {/* Origin indicator */}
            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#3E000C]/10">
              <div className="flex items-center gap-2 text-[#3E000C]/80">
                <LocateFixed className="w-4 h-4 text-[#3E000C]" />
                <span className="font-medium">
                  {isReal ? "GPS Origin" : "Origin: Hyderabad Center"}
                </span>
                <span className="font-mono text-[10px] text-[#3E000C]/60">
                  {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                </span>
              </div>
              {!isReal && (
                <button
                  type="button"
                  onClick={() => requestLocation()}
                  className="text-[11px] font-bold text-[#3E000C] underline hover:opacity-80 cursor-pointer"
                >
                  Locate Me
                </button>
              )}
            </div>

            {/* Destination Search Box */}
            <div className="space-y-1.5 relative">
              <label
                htmlFor="dest-search"
                className="text-[11px] font-bold text-[#3E000C]/60 uppercase tracking-wider block"
              >
                {t("navSelectDestination")}
              </label>

              <div className="relative">
                <input
                  id="dest-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={destination ? destination.name : t("searchDestinationPlaceholder")}
                  className="w-full bg-white border border-[#3E000C]/20 rounded-xl pl-9 pr-8 py-2 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]"
                />
                <Search className="w-4 h-4 text-[#3E000C]/50 absolute left-3 top-2.5" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="absolute right-2.5 top-2.5 p-0.5 text-[#3E000C]/50 hover:text-[#3E000C] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete dropdown */}
              {isDropdownOpen && searchQuery.length >= 2 && (
                <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-[#3E000C]/20 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 text-xs text-[#3E000C]/70 flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t("searchingDestinations")}</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="p-1 space-y-0.5">
                      {searchResults.map((result, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectDestination(result)}
                          className="w-full p-2 text-left hover:bg-[#FFECD1]/40 rounded-lg text-xs cursor-pointer flex items-start gap-2"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#3E000C]/60 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[#3E000C] truncate">{result.name}</div>
                            <div className="text-[10px] text-[#3E000C]/60 truncate">
                              {result.address}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-xs text-[#3E000C]/60 text-center">
                      {t("noDestinationsFound")}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Popular Hyderabad Landmarks Quick Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-[#3E000C]/60 uppercase tracking-wider block">
                {t("quickDestinations")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_HYDERABAD_DESTINATIONS.map((dest, idx) => {
                  const isCurrent = destination.name === dest.name;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDestination(dest)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                        isCurrent
                          ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C] font-bold"
                          : "bg-white text-[#3E000C]/80 border-[#3E000C]/15 hover:border-[#3E000C]/35"
                      }`}
                    >
                      {dest.name.split(",")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Route Options Comparison Cards */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-[#3E000C]/60 uppercase tracking-wider block">
                {t("routeAlternatives")} ({routes.length})
              </span>
              {isLoadingRoutes && (
                <span className="text-[10px] text-[#3E000C]/60 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Computing corridor safety...
                </span>
              )}
            </div>

            {routes.length === 0 && !isLoadingRoutes && (
              <div className="p-4 bg-white border border-[#3E000C]/12 rounded-2xl text-xs text-[#3E000C]/70 text-center">
                No route alternatives available. Please try another destination.
              </div>
            )}

            {routes.map((route, idx) => {
              const isSelected = route.id === selectedRouteId;
              const distKm = (route.distanceMeters / 1000).toFixed(1);
              const durMin = Math.max(1, Math.round(route.durationSeconds / 60));

              return (
                <div
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all shadow-2xs space-y-2.5 ${
                    isSelected
                      ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C] ring-2 ring-[#3E000C]/30"
                      : "bg-[#FFFFFF]/90 border-[#3E000C]/12 text-[#3E000C] hover:border-[#3E000C]/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? "text-emerald-300" : "text-emerald-700"
                        }`}
                      />
                      <h3 className="font-bold text-sm leading-tight">
                        {route.isRecommended ? t("recommendedCorridor") : `${t("alternativeCorridor")} ${idx + 1}`}
                      </h3>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold shrink-0 ${
                        isSelected
                          ? "bg-[#FFECD1]/20 text-[#FFECD1] border border-[#FFECD1]/30"
                          : route.safety.safetyScore >= 80
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}
                    >
                      Safety: {route.safety.safetyScore}/100
                    </span>
                  </div>

                  <p className="text-xs opacity-85 leading-relaxed font-normal">
                    {route.recommendationReason}
                  </p>

                  {/* Computed Reasons that were actually evaluated */}
                  <div className="space-y-1 pt-1 border-t border-current/10">
                    {route.safety.computedReasons.map((reason, rIdx) => (
                      <div key={rIdx} className="text-[11px] flex items-start gap-1.5 opacity-90">
                        <CheckCircle
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            isSelected ? "text-emerald-300" : "text-emerald-700"
                          }`}
                        />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t border-current/15 text-xs font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 opacity-70" />
                      {durMin} mins
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 opacity-70" />
                      {distKm} km
                    </span>
                    {route.extraDistancePercent > 0 && (
                      <span className="text-[10px] opacity-75">
                        (+{route.extraDistancePercent}% dist)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Action Button & Active Turn-by-Turn Panel */}
          {!isNavigating ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full font-semibold"
              onClick={handleStartNavigation}
              disabled={routes.length === 0}
              leftIcon={<Navigation className="w-4 h-4 text-[#FFECD1]" />}
            >
              {t("startNavigation")}
            </Button>
          ) : (
            <div className="bg-[#FFFFFF]/90 border border-[#3E000C]/15 rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#3E000C] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  {t("liveNavActive")}
                </span>
                <button
                  type="button"
                  onClick={() => setIsNavigating(false)}
                  className="text-[11px] font-semibold text-[#3E000C]/60 hover:text-[#3E000C] cursor-pointer"
                >
                  {t("endTrip")}
                </button>
              </div>

              {/* Turn-by-Turn step from ORS */}
              <div className="p-3 bg-[#FFECD1]/35 rounded-xl border border-[#3E000C]/10 space-y-1">
                <div className="text-[10px] font-bold text-[#3E000C]/60 uppercase tracking-wider">
                  {t("turnByTurnNav")}: {currentStepIndex + 1} /{" "}
                  {Math.max(1, turnByTurnSteps.length)}
                </div>
                <div className="text-xs font-bold text-[#3E000C]">
                  {turnByTurnSteps[currentStepIndex]?.text || "Proceed along corridor"}
                </div>
                <div className="text-[11px] text-[#3E000C]/70">
                  {turnByTurnSteps[currentStepIndex]?.dist}
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
                  ? t("destinationReached")
                  : t("nextDirection")}
              </Button>
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Leaflet GIS Map */}
        <div className="lg:col-span-7 h-[560px] rounded-3xl overflow-hidden border border-[#3E000C]/15 shadow-sm">
          <DynamicMap
            center={[coordinates.lat, coordinates.lng]}
            zoom={14}
            markers={[startMarker, endMarker, ...hazardMarkers]}
            polylines={mapPolylines}
          />
        </div>
      </div>
    </div>
  );
}
