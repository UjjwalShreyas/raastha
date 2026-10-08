"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

// Standard Hyderabad GHMC Central Corridor coordinates (17.385, 78.4867)
export const HYDERABAD_FALLBACK_COORDINATES: [number, number] = [17.385, 78.4867];

export type LocationPermissionStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface LocationContextType {
  coordinates: LocationCoordinates;
  status: LocationPermissionStatus;
  isReal: boolean;
  accuracy: number | null;
  error: string | null;
  requestLocation: () => Promise<LocationCoordinates>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coordinates, setCoordinates] = useState<LocationCoordinates>({
    lat: HYDERABAD_FALLBACK_COORDINATES[0],
    lng: HYDERABAD_FALLBACK_COORDINATES[1],
  });
  const [status, setStatus] = useState<LocationPermissionStatus>("idle");
  const [isReal, setIsReal] = useState<boolean>(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Request location ONLY when a feature explicitly needs it (not on page mount)
  const requestLocation = useCallback((): Promise<LocationCoordinates> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        setStatus("unsupported");
        setError("Geolocation is not supported by your browser. Using Hyderabad city center.");
        setIsReal(false);
        resolve({
          lat: HYDERABAD_FALLBACK_COORDINATES[0],
          lng: HYDERABAD_FALLBACK_COORDINATES[1],
        });
        return;
      }

      setStatus("loading");
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setCoordinates(coords);
          setAccuracy(pos.coords.accuracy || 10);
          setStatus("granted");
          setIsReal(true);
          resolve(coords);
        },
        (err) => {
          console.warn("GPS access notice:", err.message);
          setStatus("denied");
          setError("GPS access was denied or timed out. Using Hyderabad corridor coordinates.");
          setIsReal(false);
          // Fallback to Hyderabad
          const fallback = {
            lat: HYDERABAD_FALLBACK_COORDINATES[0],
            lng: HYDERABAD_FALLBACK_COORDINATES[1],
          };
          setCoordinates(fallback);
          setAccuracy(null);
          resolve(fallback);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }, []);

  return (
    <LocationContext.Provider
      value={{
        coordinates,
        status,
        isReal,
        accuracy,
        error,
        requestLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
