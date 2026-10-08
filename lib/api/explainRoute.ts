import { ExplainRouteOutput, RouteFact } from "@/lib/ai/schemas";

export async function explainRoute(
  safestRoute: { minutes: number; km: number; safetyScore: number; facts: RouteFact[] },
  fastestRoute: { minutes: number; km: number; safetyScore: number; facts: RouteFact[] },
  language: "en" | "hi" | "te" = "en"
): Promise<{ ok: boolean; data: ExplainRouteOutput; isMock?: boolean }> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_AI === "true") {
    return {
      ok: true,
      isMock: true,
      data: {
        safest_reason_local: "Follows illuminated arterial roads with active surveillance.",
        fastest_reason_local: "Shortest transit duration through inner alleys.",
      },
    };
  }

  try {
    const res = await fetch("/api/ai/explain-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ safestRoute, fastestRoute, language }),
    });

    const json = await res.json();
    if (json.ok && json.data) {
      return { ok: true, data: json.data };
    }
  } catch (err) {
    console.warn("Explain route network error:", err);
  }

  return {
    ok: true,
    data: {
      safest_reason_local: "Optimized for illumination and road safety.",
      fastest_reason_local: "Optimized for minimal transit time.",
    },
  };
}
