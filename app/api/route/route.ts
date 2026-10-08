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

/**
 * Decode Google Maps encoded overview polyline to [lat, lng][] array
 */
function decodeGooglePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([Number((lat / 1e5).toFixed(6)), Number((lng / 1e5).toFixed(6))]);
  }
  return points;
}

/** Clean HTML tags from Google Maps step instructions */
function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
}

/**
 * Fetch routes from Google Maps Routes API (v2 Directions)
 */
async function fetchGoogleDirections(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  profile: "driving-car" | "foot-walking",
  apiKey: string
) {
  const travelMode = profile === "foot-walking" ? "WALK" : "DRIVE";
  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description,routes.legs.steps",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: start.lat,
              longitude: start.lng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: end.lat,
              longitude: end.lng,
            },
          },
        },
        travelMode,
        computeAlternativeRoutes: true,
        languageCode: "en-US",
        routingPreference: profile === "foot-walking" ? undefined : "TRAFFIC_AWARE",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      let errText = `Status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) errText = errJson.error.message;
      } catch {
        /* ignore */
      }
      throw new Error(`Google Routes API error: ${errText}`);
    }

    const json = await res.json();
    if (!Array.isArray(json.routes) || json.routes.length === 0) {
      throw new Error("Google Routes API returned no candidate paths.");
    }

    const parsedRoutes = json.routes.map((route: any, idx: number) => {
      const distanceMeters = Number(route.distanceMeters || 0);
      const rawDur = String(route.duration || "0s").replace("s", "");
      const durationSeconds = parseInt(rawDur, 10) || Math.round(distanceMeters / 8.5);

      // Extract polyline points
      let coords: [number, number][] = [];
      if (route.polyline?.encodedPolyline) {
        coords = decodeGooglePolyline(route.polyline.encodedPolyline);
      }

      // Extract turn-by-turn maneuvers from steps
      const instructions: Array<{ text: string; dist: string; duration?: number }> = [];
      const leg = route.legs?.[0];
      if (Array.isArray(leg?.steps)) {
        for (const step of leg.steps) {
          const rawStepText =
            step.navigationInstruction?.instructions ||
            (step.navigationInstruction?.maneuver
              ? `Turn ${step.navigationInstruction.maneuver.replace(/_/g, " ").toLowerCase()}`
              : "Continue on roadway");
          const cleanText = stripHtml(rawStepText);
          const stepDistMeters = Number(step.distanceMeters || 0);
          const stepDistText =
            stepDistMeters >= 1000
              ? `${(stepDistMeters / 1000).toFixed(1)}km`
              : `${stepDistMeters}m`;
          const stepDurSec = parseInt(String(step.staticDuration || "0").replace("s", ""), 10) || undefined;

          instructions.push({
            text: cleanText,
            dist: stepDistText,
            duration: stepDurSec,
          });
        }
      }

      const summaryName = route.description
        ? `Via ${route.description}`
        : idx === 0
        ? "Primary Google Maps Corridor"
        : `Alternative Corridor ${idx + 1}`;

      return {
        id: `gmaps-route-${idx}`,
        name: summaryName,
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

    return parsedRoutes;
  } finally {
    clearTimeout(timeout);
  }
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

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const orsKey = process.env.ORS_API_KEY;

  // 1. First priority: Google Maps Directions API (Highest accuracy & real-time traffic corridors)
  if (googleApiKey) {
    try {
      const gmapsRoutes = await fetchGoogleDirections(start, end, profile, googleApiKey);
      if (gmapsRoutes.length > 0) {
        logRouteRequestAnonymously(
          start,
          end,
          gmapsRoutes[0].coordinates,
          gmapsRoutes[0].distanceMeters,
          gmapsRoutes[0].durationSeconds
        );

        return NextResponse.json({
          available: true,
          provider: "google_maps",
          routes: gmapsRoutes,
        });
      }
    } catch (gmapsErr: any) {
      console.warn("Google Maps Directions API warning:", gmapsErr.message);
    }
  }

  // 2. Second priority: OpenRouteService if configured
  if (orsKey) {
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

      if (orsRes.ok) {
        const geojson = await orsRes.json();
        const features = geojson?.features;

        if (Array.isArray(features) && features.length > 0) {
          const parsedRoutes = features.map((feature: any, idx: number) => {
            const coords: [number, number][] = (feature.geometry?.coordinates || []).map(
              (c: [number, number]) => [c[1], c[0]]
            );
            const summary = feature.properties?.summary || {};
            const distanceMeters = summary.distance || 0;
            const durationSeconds = summary.duration || 0;

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

          if (parsedRoutes.length > 0) {
            logRouteRequestAnonymously(
              start,
              end,
              parsedRoutes[0].coordinates,
              parsedRoutes[0].distanceMeters,
              parsedRoutes[0].durationSeconds
            );

            return NextResponse.json({
              available: true,
              provider: "openrouteservice",
              routes: parsedRoutes,
            });
          }
        }
      }
    } catch (orsErr: any) {
      console.warn("OpenRouteService API warning:", orsErr.message);
    }
  }

  // 3. Fallback: Projected Straight Line Corridor
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
    error: "Using projected corridor. Configure Google Maps or OpenRouteService for real turn-by-turn.",
    isStraightLineFallback: true,
    routes: fallbackRoutes,
  });
}
