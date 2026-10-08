"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type VoiceLocale = "en-IN" | "hi-IN" | "te-IN";

/**
 * Maps app language codes (EN, HI, TE) to standard Indian BCP-47 locale tags.
 */
export function getLocale(langCode: string): VoiceLocale {
  const upper = (langCode || "EN").toUpperCase();
  if (upper === "HI" || upper === "HI-IN") return "hi-IN";
  if (upper === "TE" || upper === "TE-IN") return "te-IN";
  return "en-IN";
}

/**
 * Maps recognition error codes to clear, friendly user notifications.
 */
export function mapRecognitionError(error: string): string {
  switch (error) {
    case "not-allowed":
      return "Microphone permission denied. Please allow microphone access in your browser settings.";
    case "no-speech":
      return "No speech was detected. Please try speaking again.";
    case "language-not-supported":
      return "Speech recognition is not supported for this language on your device.";
    case "network":
      return "Network connection issue during speech recognition.";
    default:
      return `Voice recognition notice: ${error}`;
  }
}

export interface UseRecognitionOptions {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
}

export interface UseRecognitionReturn {
  start: () => void;
  stop: () => void;
  listening: boolean;
  supported: boolean;
  error: string | null;
}

/**
 * Hook providing an independent SpeechRecognition instance per component.
 */
export function useRecognition(
  lang: string,
  options?: UseRecognitionOptions
): UseRecognitionReturn {
  const [listening, setListening] = useState<boolean>(false);
  const [supported, setSupported] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const targetLocale = getLocale(lang);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSupported(false);
      return;
    }

    setSupported(true);

    try {
      const recognizer = new SpeechRecognitionClass();
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = targetLocale;

      recognizer.onresult = (event: any) => {
        let interimText = "";
        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalText += item[0].transcript;
          } else {
            interimText += item[0].transcript;
          }
        }

        if (interimText && optionsRef.current?.onInterim) {
          optionsRef.current.onInterim(interimText);
        }
        if (finalText && optionsRef.current?.onFinal) {
          optionsRef.current.onFinal(finalText);
        }
      };

      recognizer.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          const msg = mapRecognitionError(event.error);
          setError(msg);
        }
        setListening(false);
      };

      recognizer.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognizer;
    } catch {
      setSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [targetLocale]);

  const start = useCallback(() => {
    setError(null);
    if (!recognitionRef.current) {
      setError("Speech recognition is not supported on this device/browser.");
      return;
    }
    try {
      recognitionRef.current.lang = targetLocale;
      recognitionRef.current.start();
      setListening(true);
    } catch (err: any) {
      if (err.name !== "InvalidStateError") {
        setError("Could not activate microphone. Please verify permissions.");
      }
    }
  }, [targetLocale]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setListening(false);
  }, []);

  return {
    start,
    stop,
    listening,
    supported,
    error,
  };
}

/**
 * Finds a matching voice installed on the device for the given language.
 */
export function getMatchingVoice(langCode: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const targetLocale = getLocale(langCode).toLowerCase(); // "en-in", "hi-in", "te-in"
  const langPrefix = targetLocale.split("-")[0]; // "en", "hi", "te"

  // 1. Exact match e.g. "te-in" or "hi-in"
  const exact = voices.find(
    (v) => v.lang.toLowerCase().replace("_", "-") === targetLocale
  );
  if (exact) return exact;

  // 2. Prefix match e.g. "te" or "hi"
  const prefix = voices.find((v) => {
    const vLang = v.lang.toLowerCase().replace("_", "-");
    return vLang.startsWith(langPrefix);
  });
  if (prefix) return prefix;

  return null;
}

/**
 * speak(text, lang)
 * Returns false if the device has no voice for that language or if synthesis fails.
 * Callers must pass already-translated text via t(), and show the same text as a toast when speak() returns false.
 */
export function speak(text: string, lang: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  const matchingVoice = getMatchingVoice(lang);
  if (!matchingVoice) {
    // Crucial safety check: device has no voice for this language!
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = matchingVoice;
    utterance.lang = matchingVoice.lang;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn("Speech synthesis notice:", err);
    return false;
  }
}
