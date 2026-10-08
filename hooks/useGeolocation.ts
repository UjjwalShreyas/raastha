"use client";

import { useState, useEffect, useCallback } from "react";
import { MOCK_BASE_COORDINATES } from "@/lib/mockData";

export interface Coordinates {
  lat: number;
  lng: number;
}

export function useGeolocation() {
  const [coordinates, setCoordinates] = useState<Coordinates>({
    lat: MOCK_BASE_COORDINATES[0],
    lng: MOCK_BASE_COORDINATES[1],
  });
  const [accuracy, setAccuracy] = useState<number | null>(12); // in meters
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(false);

  const getLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser. Using simulated civic corridor coordinates.");
      setIsUsingFallback(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setAccuracy(position.coords.accuracy || 8);
        setIsUsingFallback(false);
        setLoading(false);
      },
      (err) => {
        console.warn("Geolocation request notice:", err.message);
        setError("GPS access denied or unavailable. Fallback to city center.");
        setIsUsingFallback(true);
        // Fallback default coordinates
        setCoordinates({
          lat: MOCK_BASE_COORDINATES[0],
          lng: MOCK_BASE_COORDINATES[1],
        });
        setAccuracy(15);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 10000,
      }
    );
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  return {
    coordinates,
    accuracy,
    loading,
    error,
    isUsingFallback,
    getLocation,
  };
}
