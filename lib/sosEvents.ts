/**
 * Custom window events for triggering the Emergency SOS assistance sheet safely.
 * Raastha does NOT automatically dispatch or send messages on its own.
 * Any emergency intent opens the user's local SOS sheet.
 */

export const SOS_OPEN_EVENT = "raastha:open-sos";
export const SOS_CLOSE_EVENT = "raastha:close-sos";

export function openSosSheet(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SOS_OPEN_EVENT));
  }
}

export function closeSosSheet(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SOS_CLOSE_EVENT));
  }
}
