"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type IssueType = "pothole" | "streetlight" | "garbage" | "waterlogging" | "other";
export type IssueStatus = "reported" | "dispatched" | "in_progress" | "resolved" | "rejected";
export type SeveritySource = "ai" | "manual";

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
}

export interface UpdateStatusOptions {
  afterPhoto?: File | string;
  note?: string;
}

export interface IssuesContextType {
  issues: Issue[];
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  refreshIssues: () => Promise<void>;
  addReportedIssue: (input: AddIssueInput) => Promise<Issue>;
  updateIssueStatus: (
    id: string,
    status: IssueStatus,
    options?: UpdateStatusOptions
  ) => Promise<void>;
  latestAlert: Issue | null;
  clearAlert: () => void;
}

const IssuesContext = createContext<IssuesContextType | undefined>(undefined);

// Web Audio API civic chime on high severity alert (4 or 5)
function playHighAlertChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    console.warn("Chime playback error:", err);
  }
}

// Initial starter data for Hyderabad if table is empty
const INITIAL_DEMO_ISSUES: Issue[] = [
  {
    id: "3e0c0001-0000-4000-8000-000000000001",
    tracking_id: "RST-CYBER01",
    type: "pothole",
    severity: 5,
    severity_source: "ai",
    description: "Deep pothole at Cyber Towers incline bottlenecking evening traffic.",
    lat: 17.4435,
    lng: 78.3772,
    ward: "Circle 20 - Madhapur / Serilingampally, Hyderabad",
    photo_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80",
    after_photo_url: null,
    ai_summary: "Severe road cavity detected (>15cm depth). Immediate rim & 2-wheeler hazard.",
    status: "reported",
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: "3e0c0002-0000-4000-8000-000000000002",
    tracking_id: "RST-DURGAM02",
    type: "streetlight",
    severity: 4,
    severity_source: "ai",
    description: "Extinguished luminaire pole array near Durgam Cheruvu pedestrian stretch.",
    lat: 17.4365,
    lng: 78.3842,
    ward: "Circle 20 - Madhapur / Serilingampally, Hyderabad",
    photo_url: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80",
    after_photo_url: null,
    ai_summary: "Unlit dark stretch. 0 LUX illumination along pedestrian path.",
    status: "dispatched",
    created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: "3e0c0003-0000-4000-8000-000000000003",
    tracking_id: "RST-HITEC003",
    type: "pothole",
    severity: 3,
    severity_source: "manual",
    description: "Surface disintegration near Mindspace rotary.",
    lat: 17.4392,
    lng: 78.3811,
    ward: "Circle 20 - Madhapur / Serilingampally, Hyderabad",
    photo_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80",
    after_photo_url: null,
    ai_summary: null,
    status: "in_progress",
    created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

export function IssuesProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<Issue[]>(INITIAL_DEMO_ISSUES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latestAlert, setLatestAlert] = useState<Issue | null>(null);

  // Fetch all issues from Supabase (or fallback)
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
        setIssues(data as Issue[]);
      }
    } catch (e: any) {
      console.warn("Could not load issues:", e.message);
      setError(e.message || "Network error loading issues");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and Realtime setup
  useEffect(() => {
    refreshIssues();

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    // Subscribe to Postgres changes on the issues table
    const channel = supabase
      .channel("realtime-issues-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "issues" },
        (payload) => {
          const newRow = payload.new as Issue;
          setIssues((prev) => {
            if (prev.some((item) => item.id === newRow.id)) return prev;
            return [newRow, ...prev];
          });

          // Alert for high severity hazards (severity 4 or 5)
          if (newRow.severity >= 4 && newRow.status !== "resolved") {
            setLatestAlert(newRow);
            playHighAlertChime();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "issues" },
        (payload) => {
          const updatedRow = payload.new as Issue;
          setIssues((prev) =>
            prev.map((item) => (item.id === updatedRow.id ? updatedRow : item))
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
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [refreshIssues]);

  // Add report with required photo File
  const addReportedIssue = async (input: AddIssueInput): Promise<Issue> => {
    if (!input.photo) {
      throw new Error("A genuine camera photo of the hazard is strictly required.");
    }

    if (!isSupabaseConfigured || !supabase) {
      // Offline / unconfigured fallback: create mock object with local object URL
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
        ward: input.ward || "Circle 20 - Madhapur / Serilingampally, Hyderabad",
        photo_url: fallbackPhotoUrl,
        after_photo_url: null,
        ai_summary: input.aiSummary || null,
        status: "reported",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setIssues((prev) => [mockRow, ...prev]);
      if (mockRow.severity >= 4) {
        setLatestAlert(mockRow);
        playHighAlertChime();
      }
      return mockRow;
    }

    // 1. Upload photo File to Supabase Storage bucket 'issue-photos'
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
      console.warn("Storage upload failed, attempting public bucket URL anyway:", uploadErr.message);
    }

    const { data: urlData } = supabase.storage
      .from("issue-photos")
      .getPublicUrl(storagePath);

    const publicPhotoUrl = urlData?.publicUrl || URL.createObjectURL(input.photo);

    // 2. Insert into 'issues' table (tracking_id generated automatically by DB default)
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
          ward: input.ward || "Circle 20 - Madhapur / Serilingampally, Hyderabad",
          photo_url: publicPhotoUrl,
          ai_summary: input.aiSummary || null,
          status: "reported",
        },
      ])
      .select()
      .single();

    if (insertErr || !insertedIssue) {
      throw new Error(insertErr?.message || "Failed to save issue into database.");
    }

    // 3. Insert into 'status_events' audit trail
    try {
      await supabase.from("status_events").insert([
        {
          issue_id: insertedIssue.id,
          status: "reported",
          note: "Citizen report submitted",
        },
      ]);
    } catch (auditErr) {
      console.warn("Status event audit notice:", auditErr);
    }

    const finalRow = insertedIssue as Issue;

    // Optimistically update local state if realtime takes a moment
    setIssues((prev) => {
      if (prev.some((i) => i.id === finalRow.id)) return prev;
      return [finalRow, ...prev];
    });

    if (finalRow.severity >= 4) {
      setLatestAlert(finalRow);
      playHighAlertChime();
    }

    return finalRow;
  };

  // Update status (e.g. dispatch squad, verify resolution)
  const updateIssueStatus = async (
    id: string,
    status: IssueStatus,
    options?: UpdateStatusOptions
  ): Promise<void> => {
    let afterPhotoUrl: string | undefined = undefined;

    if (options?.afterPhoto) {
      if (typeof options.afterPhoto === "string") {
        afterPhotoUrl = options.afterPhoto;
      } else if (isSupabaseConfigured && supabase) {
        // Upload repair photo File
        const fileExt = options.afterPhoto.name.split(".").pop() || "jpg";
        const fileName = `after-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const storagePath = `repairs/${fileName}`;

        await supabase.storage
          .from("issue-photos")
          .upload(storagePath, options.afterPhoto, {
            contentType: options.afterPhoto.type || "image/jpeg",
          });

        const { data: urlData } = supabase.storage
          .from("issue-photos")
          .getPublicUrl(storagePath);

        afterPhotoUrl = urlData?.publicUrl;
      } else {
        afterPhotoUrl = URL.createObjectURL(options.afterPhoto);
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      setIssues((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status,
                ...(afterPhotoUrl ? { after_photo_url: afterPhotoUrl } : {}),
                updated_at: new Date().toISOString(),
              }
            : i
        )
      );
      return;
    }

    const updatePayload: Record<string, any> = { status };
    if (afterPhotoUrl) {
      updatePayload.after_photo_url = afterPhotoUrl;
    }

    const { error: updateErr } = await supabase
      .from("issues")
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) {
      throw new Error(updateErr.message);
    }

    // Add status event audit
    try {
      await supabase.from("status_events").insert([
        {
          issue_id: id,
          status,
          note: options?.note || null,
        },
      ]);
    } catch (auditErr) {
      console.warn("Status event audit insert notice:", auditErr);
    }

    // Optimistic update
    setIssues((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status,
              ...(afterPhotoUrl ? { after_photo_url: afterPhotoUrl } : {}),
              updated_at: new Date().toISOString(),
            }
          : i
      )
    );
  };

  const clearAlert = () => setLatestAlert(null);

  return (
    <IssuesContext.Provider
      value={{
        issues,
        isLoading,
        isConfigured: isSupabaseConfigured,
        error,
        refreshIssues,
        addReportedIssue,
        updateIssueStatus,
        latestAlert,
        clearAlert,
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
