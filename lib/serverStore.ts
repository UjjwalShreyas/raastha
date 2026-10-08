import { HazardIssue, MOCK_ISSUES } from "./mockData";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

// Global cache across hot-reloads on Node server
declare global {
  // eslint-disable-next-line no-var
  var __RAASTHA_ISSUES__: HazardIssue[] | undefined;
}

if (!global.__RAASTHA_ISSUES__) {
  global.__RAASTHA_ISSUES__ = [...MOCK_ISSUES];
}

// Haversine distance formula in meters
export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const rad1 = (lat1 * Math.PI) / 180;
  const rad2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(rad1) * Math.cos(rad2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function getGlobalIssues(): Promise<HazardIssue[]> {
  // If Supabase is connected, optionally fetch from DB
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("reported_at", { ascending: false });

      if (!error && data && data.length > 0) {
        // Map database records to HazardIssue
        return data.map((row: any) => ({
          id: row.id,
          trackingId: row.tracking_id || `RST-${row.id.slice(0, 5)}`,
          title: row.title,
          type: row.type,
          severity: row.severity,
          exposureCount: row.exposure_count || 3000,
          priorityScore: row.priority_score || Math.round((row.severity * 3000) / 100),
          location: {
            lat: row.lat,
            lng: row.lng,
            address: row.address || "Ward Arterial Road",
            ward: row.ward || "Ward 151 - Koramangala",
          },
          reportedAt: row.reported_at || "Just now",
          slaMinutesRemaining: row.sla_minutes || 240,
          slaFormatted: row.sla_formatted || "4h 00m left",
          status: row.status || "Pending",
          beforePhoto: row.before_photo,
          afterPhoto: row.after_photo,
          aiClassification: row.ai_classification || {
            detectedObject: row.type,
            confidence: 92,
            hazardIndex: "Civic Roadway Defect",
            impactDescription: "Reported civic issue requiring maintenance.",
          },
          confirmationsCount: row.confirmations_count || 1,
          isClustered: row.is_clustered || false,
          resolutionNotes: row.resolution_notes,
        }));
      }
    } catch (e) {
      console.warn("Supabase fetch failed, falling back to server memory store:", e);
    }
  }

  return global.__RAASTHA_ISSUES__ || [...MOCK_ISSUES];
}

export async function addOrClusterIssue(
  newIssue: HazardIssue
): Promise<{ issue: HazardIssue; wasClustered: boolean }> {
  const currentList = global.__RAASTHA_ISSUES__ || [...MOCK_ISSUES];

  // 1. Check for duplicate clustering within 30 meters for active reports of same hazard type
  const DUPLICATE_THRESHOLD_METERS = 30;
  const existingDuplicateIndex = currentList.findIndex((existing) => {
    if (existing.status === "Resolved") return false;
    if (existing.type !== newIssue.type) return false;

    const distance = getDistanceInMeters(
      existing.location.lat,
      existing.location.lng,
      newIssue.location.lat,
      newIssue.location.lng
    );

    return distance <= DUPLICATE_THRESHOLD_METERS;
  });

  if (existingDuplicateIndex !== -1) {
    // Cluster into existing issue
    const existing = currentList[existingDuplicateIndex];
    const newConfirmations = (existing.confirmationsCount || 1) + 1;
    // Exposure increases with every distinct citizen confirmation (+500 commuters proxy)
    const boostedExposure = existing.exposureCount + 500;
    const boostedPriority = Math.round((existing.severity * boostedExposure) / 100);

    const updatedIssue: HazardIssue = {
      ...existing,
      confirmationsCount: newConfirmations,
      isClustered: true,
      exposureCount: boostedExposure,
      priorityScore: boostedPriority,
      title: `${existing.title} (+${newConfirmations - 1} Citizen Confirmations)`,
    };

    currentList[existingDuplicateIndex] = updatedIssue;
    global.__RAASTHA_ISSUES__ = currentList;

    // Optional Supabase update
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from("reports")
          .update({
            confirmations_count: newConfirmations,
            is_clustered: true,
            exposure_count: boostedExposure,
            priority_score: boostedPriority,
          })
          .eq("id", existing.id);
      } catch (err) {
        console.warn("Supabase cluster update notice:", err);
      }
    }

    return { issue: updatedIssue, wasClustered: true };
  }

  // 2. New distinct hazard report
  const cleanIssue: HazardIssue = {
    ...newIssue,
    confirmationsCount: 1,
    isClustered: false,
    priorityScore: Math.round((newIssue.severity * newIssue.exposureCount) / 100),
  };

  global.__RAASTHA_ISSUES__ = [cleanIssue, ...currentList];

  // Optional Supabase insert
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("reports").insert({
        id: cleanIssue.id,
        tracking_id: cleanIssue.trackingId,
        title: cleanIssue.title,
        type: cleanIssue.type,
        severity: cleanIssue.severity,
        exposure_count: cleanIssue.exposureCount,
        priority_score: cleanIssue.priorityScore,
        lat: cleanIssue.location.lat,
        lng: cleanIssue.location.lng,
        address: cleanIssue.location.address,
        ward: cleanIssue.location.ward,
        status: cleanIssue.status,
        before_photo: cleanIssue.beforePhoto,
        after_photo: cleanIssue.afterPhoto,
        ai_classification: cleanIssue.aiClassification,
        confirmations_count: 1,
        is_clustered: false,
      });
    } catch (err) {
      console.warn("Supabase insert notice:", err);
    }
  }

  return { issue: cleanIssue, wasClustered: false };
}

export async function updateGlobalIssue(
  id: string,
  updates: Partial<HazardIssue>
): Promise<HazardIssue | null> {
  const currentList = global.__RAASTHA_ISSUES__ || [...MOCK_ISSUES];
  const idx = currentList.findIndex((i) => i.id === id);

  if (idx === -1) return null;

  const updated: HazardIssue = {
    ...currentList[idx],
    ...updates,
  };

  currentList[idx] = updated;
  global.__RAASTHA_ISSUES__ = currentList;

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from("reports")
        .update({
          status: updated.status,
          after_photo: updated.afterPhoto,
          resolution_notes: updated.resolutionNotes,
        })
        .eq("id", id);
    } catch (err) {
      console.warn("Supabase update error:", err);
    }
  }

  return updated;
}
