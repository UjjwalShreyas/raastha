"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isHighSeverityAlertable, RouteRequestLog } from "@/lib/dispatch";

export type IssueType = "pothole" | "streetlight" | "garbage" | "waterlogging" | "other";
export type IssueStatus = "reported" | "dispatched" | "in_progress" | "resolved" | "rejected";
export type SeveritySource = "ai" | "manual";
export type RealtimeStatus = "offline" | "connecting" | "live" | "polling";

export interface Issue {
  id: string;
  tracking_id: string;
  type: IssueType;
  severity: number;
  severity_source: SeveritySource;
  description: string | null;
  lat: number;
  lng: number;
  ward: string | null;
  photo_url: string;
  after_photo_url?: string | null;
  ai_summary?: string | null;
  status: IssueStatus;
  created_at: string;
  updated_at: string;
  is_sample?: boolean;
  /** Reporter's own estimate of daily commuters (not measured). */
  commuter_estimate?: number;
  assignee?: string | null;
  sla_due_at?: string | null;
}

export interface AddIssueInput {
  type: IssueType;
  severity: number;
  severitySource: SeveritySource;
  description?: string;
  lat: number;
  lng: number;
  ward?: string;
  photo: File; // Required photo File
  aiSummary?: string;
  commuterEstimate?: number;
}

export interface UpdateStatusOptions {
  /** Repair proof (required by the database when resolving). */
  afterPhoto?: File;
  note?: string;
  /** Required when dispatching. */
  assignee?: string;
  /** Required when dispatching (ISO timestamp). */
  slaDueAt?: string;
}

export interface IssuesContextType {
  issues: Issue[];
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  realtimeStatus: RealtimeStatus;
  refreshIssues: () => Promise<void>;
  addReportedIssue: (input: AddIssueInput) => Promise<Issue>;
  /** Requires a signed-in authority; the database enforces the same rule. */
  updateIssueStatus: (
    id: string,
    status: IssueStatus,
    options?: UpdateStatusOptions
  ) => Promise<void>;
  /** Newest severity 4-5 report that arrived live since this page loaded. */
  latestAlert: Issue | null;
  clearAlert: () => void;
  /** Severity 4-5, still 'reported', real (non-sample) and not yet acknowledged. */
  unseenHighCount: number;
  unseenHighIds: string[];
  markHighSeen: (id: string) => void;
  markAllHighSeen: () => void;
  /** Route requests logged in the last 24h used to compute genuine commuter exposure */
  recentRouteRequests: RouteRequestLog[];
}

const IssuesContext = createContext<IssuesContextType | undefined>(undefined);

const SEEN_STORAGE_KEY = "raastha.seenHighSeverity.v1";
const POLL_INTERVAL_MS = 10_000;

// Starter data for Hyderabad (explicitly labelled Sample data). Only visible
// when Supabase is not configured or before the first fetch completes; the
// database rows replace it. Optional DB seeding lives in supabase/seed.sql.
const INITIAL_DEMO_ISSUES: Issue[] = [
  {
    id: "3e0c0001-0000-4000-8000-000000000001",
    tracking_id: "SAMPLE-GHMC-01",
    type: "pothole",
    severity: 5,
    severity_source: "ai",
    description: "Deep pothole at Cyber Towers Incline bottlenecking evening traffic.",
    lat: 17.4504,
    lng: 78.3808,
    ward: "Circle 20 - Serilingampally (Madhapur & Hitec City)",
    photo_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80",
    after_photo_url: null,
    ai_summary: "Severe road cavity detected. Immediate rim & 2-wheeler hazard.",
    status: "reported",
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    is_sample: true,
    commuter_estimate: 6500,
  },
  {
    id: "3e0c0002-0000-4000-8000-000000000002",
    tracking_id: "SAMPLE-GHMC-02",
    type: "streetlight",
    severity: 4,
    severity_source: "ai",
    description: "Extinguished luminaire pole array near Road No. 36 approach.",
    lat: 17.4259,
    lng: 78.4215,
    ward: "Circle 18 - Jubilee Hills & Banjara Hills",
    photo_url: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80",
    after_photo_url: null,
    ai_summary: "Unlit dark stretch. Low illumination along pedestrian path.",
    status: "dispatched",
    created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    is_sample: true,
    commuter_estimate: 4000,
  },
  {
    id: "3e0c0003-0000-4000-8000-000000000003",
    tracking_id: "SAMPLE-GHMC-03",
    type: "other",
    severity: 5,
    severity_source: "manual",
    description: "Damaged drainage chamber opening near Charminar South Gate.",
    lat: 17.3616,
    lng: 78.4747,
    ward: "Circle 10 - Charminar & Old City",
    photo_url: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=80",
    after_photo_url: null,
    ai_summary: null,
    status: "in_progress",
    created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    is_sample: true,
    commuter_estimate: 5000,
  },
];

function readSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function IssuesProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<Issue[]>(INITIAL_DEMO_ISSUES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latestAlert, setLatestAlert] = useState<Issue | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(
    isSupabaseConfigured ? "connecting" : "offline"
  );
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [recentRouteRequests, setRecentRouteRequests] = useState<RouteRequestLog[]>([]);

  // Ids we have already accounted for, so each new report alerts exactly once
  // regardless of whether it arrives via realtime or via polling.
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef<boolean>(false);

  useEffect(() => {
    setSeenIds(readSeenIds());
  }, []);

  const persistSeen = useCallback((next: string[]) => {
    setSeenIds(next);
    try {
      // Keep the list bounded
      window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next.slice(-500)));
    } catch {
      /* storage unavailable: seen state just won't persist */
    }
  }, []);

  /** Register a newly arrived row; alert if it is a live, high-severity report. */
  const ingestArrival = useCallback((row: Issue) => {
    if (knownIdsRef.current.has(row.id)) return;
    knownIdsRef.current.add(row.id);
    setIssues((prev) => (prev.some((i) => i.id === row.id) ? prev : [row, ...prev]));
    if (isHighSeverityAlertable(row)) {
      setLatestAlert(row);
    }
  }, []);

  const refreshIssues = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from("issues")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchErr) {
        console.warn("Supabase fetch issues error:", fetchErr.message);
        setError(fetchErr.message);
      } else if (data) {
        const rows = data as Issue[];
        setError(null);

        if (!initializedRef.current) {
          // First load: everything already existing is "known", no alerts.
          rows.forEach((r) => knownIdsRef.current.add(r.id));
          initializedRef.current = true;
        } else {
          // Later loads (polling fallback / tab refocus): alert on genuinely new rows.
          const fresh = rows.filter((r) => !knownIdsRef.current.has(r.id));
          fresh.forEach((r) => knownIdsRef.current.add(r.id));
          const newestHigh = fresh.find(isHighSeverityAlertable);
          if (newestHigh) setLatestAlert(newestHigh);
        }

        setIssues(rows);
      }

      // Also fetch route requests logged in the last 24h
      try {
        const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { data: routeData } = await supabase
          .from("route_requests")
          .select("id, created_at, waypoints")
          .gte("created_at", yesterday)
          .order("created_at", { ascending: false })
          .limit(250);

        if (routeData) {
          setRecentRouteRequests(routeData as RouteRequestLog[]);
        }
      } catch {
        /* non-critical: route_requests table may be empty or unconfigured */
      }
    } catch (e: any) {
      console.warn("Could not load issues:", e.message);
      setError(e.message || "Network error loading issues");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load + Realtime subscription
  useEffect(() => {
    refreshIssues();

    if (!isSupabaseConfigured || !supabase) {
      return;
    }
    const client = supabase;

    const channel = client
      .channel("realtime-issues-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "issues" },
        (payload) => ingestArrival(payload.new as Issue)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "issues" },
        (payload) => {
          const updatedRow = payload.new as Issue;
          setIssues((prev) =>
            prev.map((item) => (item.id === updatedRow.id ? { ...item, ...updatedRow } : item))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "issues" },
        (payload) => {
          const deletedId = (payload.old as { id?: string }).id;
          if (deletedId) {
            setIssues((prev) => prev.filter((item) => item.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("live");
          // Catch anything that arrived while the socket was (re)connecting
          refreshIssues();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtimeStatus("polling");
        }
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshIssues();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      client.removeChannel(channel);
    };
  }, [refreshIssues, ingestArrival]);

  // Polling fallback only when the realtime socket is unavailable
  useEffect(() => {
    if (realtimeStatus !== "polling") return;
    const timer = setInterval(refreshIssues, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [realtimeStatus, refreshIssues]);

  // Add report with required photo File
  const addReportedIssue = async (input: AddIssueInput): Promise<Issue> => {
    if (!input.photo) {
      throw new Error("A genuine camera photo of the hazard is strictly required.");
    }

    if (!isSupabaseConfigured || !supabase) {
      // Unconfigured fallback: local-only row (not shared with other devices)
      const fallbackPhotoUrl = URL.createObjectURL(input.photo);
      const randTracking = "RST-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const mockRow: Issue = {
        id: crypto.randomUUID ? crypto.randomUUID() : `mock-${Date.now()}`,
        tracking_id: randTracking,
        type: input.type,
        severity: input.severity,
        severity_source: input.severitySource,
        description: input.description || null,
        lat: input.lat,
        lng: input.lng,
        ward: input.ward || null,
        photo_url: fallbackPhotoUrl,
        after_photo_url: null,
        ai_summary: input.aiSummary || null,
        status: "reported",
        commuter_estimate: input.commuterEstimate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      knownIdsRef.current.add(mockRow.id);
      setIssues((prev) => [mockRow, ...prev]);
      return mockRow;
    }

    // 1. Upload photo to Storage (citizens may only write under issues/)
    const fileExt = input.photo.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const storagePath = `issues/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from("issue-photos")
      .upload(storagePath, input.photo, {
        contentType: input.photo.type || "image/jpeg",
        upsert: false,
      });

    if (uploadErr) {
      // Never store a device-local blob: URL; other devices could not load it.
      throw new Error(`Photo upload failed: ${uploadErr.message}`);
    }

    const { data: urlData } = supabase.storage.from("issue-photos").getPublicUrl(storagePath);

    // 2. Insert into 'issues' (tracking_id by DB default; the DB trigger writes
    //    the initial 'reported' status_events row)
    const { data: insertedIssue, error: insertErr } = await supabase
      .from("issues")
      .insert([
        {
          type: input.type,
          severity: input.severity,
          severity_source: input.severitySource,
          description: input.description || null,
          lat: input.lat,
          lng: input.lng,
          ward: input.ward || null,
          photo_url: urlData.publicUrl,
          ai_summary: input.aiSummary || null,
          commuter_estimate: input.commuterEstimate ?? 3500,
          status: "reported",
        },
      ])
      .select()
      .single();

    if (insertErr || !insertedIssue) {
      throw new Error(insertErr?.message || "Failed to save issue into database.");
    }

    const finalRow = insertedIssue as Issue;

    // Show it locally right away. Mark it known so the reporter's own device
    // never raises an authority alert for its own submission.
    knownIdsRef.current.add(finalRow.id);
    setIssues((prev) => (prev.some((i) => i.id === finalRow.id) ? prev : [finalRow, ...prev]));

    return finalRow;
  };

  // Change status (dispatch -> in_progress -> resolved). Authority only.
  const updateIssueStatus = async (
    id: string,
    status: IssueStatus,
    options?: UpdateStatusOptions
  ): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Backend not configured: status changes need Supabase.");
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Sign in as an authority to change status.");
    }

    let afterPhotoUrl: string | null = null;
    if (options?.afterPhoto) {
      const fileExt = options.afterPhoto.name.split(".").pop() || "jpg";
      const fileName = `after-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const storagePath = `repairs/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("issue-photos")
        .upload(storagePath, options.afterPhoto, {
          contentType: options.afterPhoto.type || "image/jpeg",
        });
      if (uploadErr) {
        throw new Error(`Repair photo upload failed: ${uploadErr.message}`);
      }
      afterPhotoUrl = supabase.storage.from("issue-photos").getPublicUrl(storagePath).data
        .publicUrl;
    }

    // Single transaction in the database: validates the transition, updates
    // the issue and inserts the status_events row.
    const { data, error: rpcErr } = await supabase.rpc("advance_issue_status", {
      p_issue_id: id,
      p_status: status,
      p_assignee: options?.assignee ?? null,
      p_sla_due_at: options?.slaDueAt ?? null,
      p_after_photo_url: afterPhotoUrl,
      p_note: options?.note ?? null,
    });

    if (rpcErr) {
      throw new Error(rpcErr.message);
    }

    const updated = data as Issue;
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, ...updated } : i)));
  };

  const clearAlert = useCallback(() => setLatestAlert(null), []);

  const unseenHighIds = useMemo(
    () => issues.filter((i) => isHighSeverityAlertable(i) && !seenIds.includes(i.id)).map((i) => i.id),
    [issues, seenIds]
  );

  const markHighSeen = useCallback(
    (id: string) => {
      setSeenIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        try {
          window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next.slice(-500)));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    []
  );

  const markAllHighSeen = useCallback(() => {
    const ids = issues.filter(isHighSeverityAlertable).map((i) => i.id);
    persistSeen(Array.from(new Set([...seenIds, ...ids])));
    setLatestAlert(null);
  }, [issues, seenIds, persistSeen]);

  return (
    <IssuesContext.Provider
      value={{
        issues,
        isLoading,
        isConfigured: isSupabaseConfigured,
        error,
        realtimeStatus,
        refreshIssues,
        addReportedIssue,
        updateIssueStatus,
        latestAlert,
        clearAlert,
        unseenHighCount: unseenHighIds.length,
        unseenHighIds,
        markHighSeen,
        markAllHighSeen,
        recentRouteRequests,
      }}
    >
      {children}
    </IssuesContext.Provider>
  );
}

export function useIssues() {
  const context = useContext(IssuesContext);
  if (!context) {
    throw new Error("useIssues must be used within an IssuesProvider");
  }
  return context;
}
