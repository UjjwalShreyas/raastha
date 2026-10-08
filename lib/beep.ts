/**
 * Short alert beep using the Web Audio API (no audio files).
 *
 * Browsers keep an AudioContext "suspended" until the user interacts with the
 * page, so a beep triggered by a realtime event on a fresh page load is silent.
 * Call enableAudio() from a click handler once ("Enable alerts"); after that
 * playBeep() works for the rest of the page's life.
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/** Must be called from a user gesture. Resolves true if audio can now play. */
export async function enableAudio(): Promise<boolean> {
  const c = getContext();
  if (!c) return false;
  try {
    if (c.state === "suspended") await c.resume();
  } catch {
    return false;
  }
  return c.state === "running";
}

/** True only if the browser currently allows sound. */
export function isAudioEnabled(): boolean {
  return ctx?.state === "running";
}

/**
 * Plays a two-tone beep. Returns false (and plays nothing) if the browser is
 * still blocking audio, so callers can prompt the user to enable alerts.
 */
export function playBeep(): boolean {
  const c = getContext();
  if (!c || c.state !== "running") return false;

  const start = c.currentTime;
  const tones: Array<{ freq: number; offset: number }> = [
    { freq: 880, offset: 0 },
    { freq: 1175, offset: 0.18 },
  ];

  for (const { freq, offset } of tones) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, start + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start + offset);
    osc.stop(start + offset + 0.18);
  }
  return true;
}
