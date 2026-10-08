import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDistanceInMeters } from "@/lib/geoUtils";

interface RouteRequestPayload {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  profile?: "driving-car" | "foot-walking";
}

/**
 * Log route request to Supabase route_requests table without user identity.
 * Sampled points are stored to enable 24h exposure counts.
 */
async function logRouteRequestAnonymously(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  primaryCoords: [number, number][],
  distanceMeters: number,
  durationSeconds: number
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return;

  try {
    const supabase = createClient(url, anon, { auth: { persistSession: false } });

    // Store a simplified set of waypoints (keep under 60 points) to save space
    const step = Math.max(1, Math.floor(primaryCoords.length / 50));
    const simplifiedPoints: [number, number][] = [];
    for (let i = 0; i < primaryCoords.length; i += step) {
      simplifiedPoints.push(primaryCoords[i]);
    }
    if (
      primaryCoords.length > 0 &&
      simplifiedPoints[simplifiedPoints.length - 1] !== primaryCoords[primaryCoords.length - 1]
    ) {
      simplifiedPoints.push(primaryCoords[primaryCoords.length - 1]);
    }

    await supabase.from("route_requests").insert([
      {
        origin_lat: start.lat,
        origin_lng: start.lng,
        dest_lat: end.lat,
        dest_lng: end.lng,
        waypoints: simplifiedPoints,
        distance_meters: Math.round(distanceMeters),
        duration_seconds: Math.round(durationSeconds),
      },
    ]);
  } catch (err) {
    // Non-blocking log failure
    console.warn("Could not log route request to database:", err);
  }
}

/** Generate an honest, clearly labelled straight-line fallback route */
function generateStraightLineFallback(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  profile: "driving-car" | "foot-walking"
) {
  const distM = getDistanceInMeters(start.lat, start.lng, end.lat, end.lng);
  const speedMetersPerSec = profile === "foot-walking" ? 1.35 : 8.5; // ~5 km/h walking or ~30 km/h city driving
  const durSec = Math.max(60, Math.round(distM / speedMetersPerSec));

  // Intermediate points along the straight line
  const stepsCount = Math.max(2, Math.min(20, Math.floor(distM / 200)));
  const coords: [number, number][] = [];
  for (let i = 0; i <= stepsCount; i++) {
    const fraction = i / stepsCount;
    coords.push([
      start.lat + (end.lat - start.lat) * fraction,
      start.lng + (end.lng - start.lng) * fraction,
    ]);
  }

  const distKm = (distM / 1000).toFixed(1);
  const durMin = Math.max(1, Math.round(durSec / 60));

  return [
    {
      id: "straight-line-fallback",
      name: "Direct Projected Corridor (Fallback)",
      coordinates: coords,
      distanceMeters: Math.round(distM),
      durationSeconds: durSec,
      isStraightLineFallback: true,
      instructions: [
        {
          text: `Head directly toward destination along projected line (${distKm} km)`,
          dist: `${Math.round(distM)}m`,
          duration: durSec,
        },
        {
          text: "Arrive at destination",
          dist: "0m",
          duration: 0,
        },
      ],
    },
  ];
}

export async function POST(req: NextRequest) {
  let body: RouteRequestPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { available: false, error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const { start, end, profile = "driving-car" } = body;

  if (
    typeof start?.lat !== "number" ||
    typeof start?.lng !== "number" ||
    typeof end?.lat !== "number" ||
    typeof end?.lng !== "number"
  ) {
    return NextResponse.json(
      { available: false, error: "Valid start and end coordinates with lat and lng are required." },
      { status: 400 }
    );
  }

  const orsKey = process.env.ORS_API_KEY;

  if (!orsKey) {
    const fallbackRoutes = generateStraightLineFallback(start, end, profile);
    // Log fallback request asynchronously
    logRouteRequestAnonymously(
      start,
      end,
      fallbackRoutes[0].coordinates,
      fallbackRoutes[0].distanceMeters,
      fallbackRoutes[0].durationSeconds
    );

    return NextResponse.json({
      available: false,
      error: "OpenRouteService API key is not configured on the server (ORS_API_KEY in .env.local).",
      isStraightLineFallback: true,
      routes: fallbackRoutes,
    });
  }

  try {
    const orsProfile = profile === "foot-walking" ? "foot-walking" : "driving-car";
    const orsUrl = `https://api.openrouteservice.org/v2/directions/${orsProfile}/geojson`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const orsRes = await fetch(orsUrl, {
      method: "POST",
      headers: {
        Authorization: orsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [start.lng, start.lat],
          [end.lng, end.lat],
        ],
        alternative_routes: {
          target_count: 3,
          weight_factor: 1.4,
          share_factor: 0.6,
        },
        instructions: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!orsRes.ok) {
      let errDetail = `Status ${orsRes.status}`;
      try {
        const errJson = await orsRes.json();
        if (errJson?.error?.message) errDetail = errJson.error.message;
        else if (errJson?.error) errDetail = String(errJson.error);
      } catch {
        /* ignore parse error */
      }

      console.warn("OpenRouteService API error:", errDetail);
      const fallbackRoutes = generateStraightLineFallback(start, end, profile);
      logRouteRequestAnonymously(
        start,
        end,
        fallbackRoutes[0].coordinates,
        fallbackRoutes[0].distanceMeters,
        fallbackRoutes[0].durationSeconds
      );

      return NextResponse.json({
        available: false,
        error: `OpenRouteService error: ${errDetail}`,
        isStraightLineFallback: true,
        routes: fallbackRoutes,
      });
    }

    const geojson = await orsRes.json();
    const features = geojson?.features;

    if (!Array.isArray(features) || features.length === 0) {
      const fallbackRoutes = generateStraightLineFallback(start, end, profile);
      return NextResponse.json({
        available: false,
        error: "OpenRouteService returned no routes for this corridor.",
        isStraightLineFallback: true,
        routes: fallbackRoutes,
      });
    }

    const parsedRoutes = features.map((feature: any, idx: number) => {
      // GeoJSON has coordinates as [lng, lat]. Convert to Leaflet [lat, lng].
      const coords: [number, number][] = (feature.geometry?.coordinates || []).map(
        (c: [number, number]) => [c[1], c[0]]
      );

      const summary = feature.properties?.summary || {};
      const distanceMeters = summary.distance || 0;
      const durationSeconds = summary.duration || 0;

      // Extract real turn-by-turn instructions from ORS segments
      const instructions: Array<{ text: string; dist: string; duration?: number }> = [];
      const segments = feature.properties?.segments;
      if (Array.isArray(segments)) {
        for (const seg of segments) {
          if (Array.isArray(seg.steps)) {
            for (const step of seg.steps) {
              const distM = Math.round(step.distance || 0);
              const text = step.instruction || (step.name ? `Follow ${step.name}` : "Proceed along street");
              instructions.push({
                text,
                dist: distM >= 1000 ? `${(distM / 1000).toFixed(1)}km` : `${distM}m`,
                duration: step.duration,
              });
            }
          }
        }
      }

      const routeName =
        idx === 0
          ? "Primary Street Corridor"
          : idx === 1
          ? "Alternative Arterial Option 2"
          : "Alternative Sector Option 3";

      return {
        id: `ors-route-${idx}`,
        name: routeName,
        coordinates: coords,
        distanceMeters,
        durationSeconds,
        instructions:
          instructions.length > 0
            ? instructions
            : [
                {
                  text: `Follow route to destination (${(distanceMeters / 1000).toFixed(1)} km)`,
                  dist: `${Math.round(distanceMeters)}m`,
                  duration: durationSeconds,
                },
              ],
        isStraightLineFallback: false,
      };
    });

    // Log the primary route request asynchronously
    if (parsedRoutes.length > 0) {
      logRouteRequestAnonymously(
        start,
        end,
        parsedRoutes[0].coordinates,
        parsedRoutes[0].distanceMeters,
        parsedRoutes[0].durationSeconds
      );
    }

    return NextResponse.json({
      available: true,
      provider: "openrouteservice",
      routes: parsedRoutes,
    });
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    const errorMsg = isTimeout
      ? "OpenRouteService request timed out after 15 seconds."
      : err?.message || "Failed to reach OpenRouteService.";

    const fallbackRoutes = generateStraightLineFallback(start, end, profile);
    logRouteRequestAnonymously(
      start,
      end,
      fallbackRoutes[0].coordinates,
      fallbackRoutes[0].distanceMeters,
      fallbackRoutes[0].durationSeconds
    );

    return NextResponse.json({
      available: false,
      error: errorMsg,
      isStraightLineFallback: true,
      routes: fallbackRoutes,
    });
  }
}
