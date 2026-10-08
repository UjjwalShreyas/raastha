import { ClarifyOutput, ProcessedClassification } from "@/lib/ai/schemas";

export async function fetchClarifications(
  classification: Partial<ProcessedClassification>,
  language: "en" | "hi" | "te" = "en",
  location?: { lat?: number; lng?: number }
): Promise<{ ok: boolean; data: ClarifyOutput; isMock?: boolean }> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_AI === "true") {
    return {
      ok: true,
      isMock: true,
      data: {
        questions: [
          {
            id: "path_blockage",
            text_local: "Is this hazard blocking the pedestrian walkway or vehicle flow?",
            options: [
              { id: "blocking_full", label_local: "Completely Blocking" },
              { id: "blocking_partial", label_local: "Partially Blocking" },
              { id: "blocking_none", label_local: "Clear Flow" },
            ],
          },
        ],
      },
    };
  }

  try {
    const res = await fetch("/api/ai/clarify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classification,
        language,
        lat: location?.lat,
        lng: location?.lng,
      }),
    });

    const json = await res.json();
    if (json.ok && json.data) {
      return { ok: true, data: json.data };
    }
  } catch (err) {
    console.warn("Clarifications network error:", err);
  }

  return {
    ok: true,
    data: {
      questions: [
        {
          id: "path_blockage",
          text_local: "Is this hazard blocking the pedestrian walkway or vehicle flow?",
          options: [
            { id: "blocking_full", label_local: "Completely Blocking" },
            { id: "blocking_none", label_local: "Clear Flow" },
          ],
        },
      ],
    },
  };
}
