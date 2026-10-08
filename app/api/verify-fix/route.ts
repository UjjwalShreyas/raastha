import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_IMAGE_BASE64_CHARS = 6_000_000; // ~4.5 MB of image data
const TIMEOUT_MS = 20_000;

/** Only signed-in authorities may spend Gemini quota on fix verification. */
async function getAuthority(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return null;
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}

function unavailable(reason: string) {
  // Never invent a verdict. The officer decides manually when AI is unavailable.
  return NextResponse.json({ available: false, reason });
}

export async function POST(req: NextRequest) {
  const user = await getAuthority(req);
  if (!user) {
    return NextResponse.json({ available: false, reason: "Unauthorized" }, { status: 401 });
  }

  let body: { afterImage?: string; hazardType?: string };
  try {
    body = await req.json();
  } catch {
    return unavailable("Invalid request body.");
  }

  const { afterImage, hazardType = "road hazard" } = body;
  if (!afterImage) return unavailable("After photo is required.");

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) return unavailable("AI service is not configured on the server.");

  const match = afterImage.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) return unavailable("After photo must be a base64 image data URL.");
  const [, mimeType, base64] = match;
  if (base64.length > MAX_IMAGE_BASE64_CHARS) return unavailable("After photo is too large.");

  const prompt = `You assist a municipal engineer reviewing a photo submitted as proof that a reported ${hazardType} was repaired.
Judge only what is visible. This is an estimate to support a human decision, not a certification.
Return JSON: repaired (boolean: true only if the defect looks fixed), confidence (0 to 1), summary (one or two plain sentences).
If the photo is unclear, unrelated, or does not show a road/streetlight, set repaired to false and say why.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                repaired: { type: "BOOLEAN" },
                confidence: { type: "NUMBER" },
                summary: { type: "STRING" },
              },
              required: ["repaired", "confidence", "summary"],
            },
          },
        }),
      }
    );

    if (!res.ok) return unavailable(`AI service returned ${res.status}.`);

    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return unavailable("AI returned no result.");

    const parsed = JSON.parse(text);
    if (
      typeof parsed.repaired !== "boolean" ||
      typeof parsed.confidence !== "number" ||
      typeof parsed.summary !== "string"
    ) {
      return unavailable("AI returned an unexpected format.");
    }

    return NextResponse.json({
      available: true,
      repaired: parsed.repaired,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
      summary: parsed.summary,
    });
  } catch (err: unknown) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return unavailable(aborted ? "AI request timed out." : "AI request failed.");
  } finally {
    clearTimeout(timer);
  }
}
