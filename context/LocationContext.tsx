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
  formattedAddress: string;
  requestLocation: () => Promise<LocationCoordinates>;
  setCustomCoordinates: (coords: LocationCoordinates) => void;
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
  const [formattedAddress, setFormattedAddress] = useState<string>("Hyderabad Central Zone");

  const requestLocation = useCallback((): Promise<LocationCoordinates> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        setStatus("unsupported");
        setError("Geolocation is not supported by your browser. Using fallback coordinates.");
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
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          };
          setCoordinates(coords);
          setAccuracy(Math.round(pos.coords.accuracy || 15));
          setStatus("granted");
          setIsReal(true);
          setFormattedAddress(`${coords.lat}° N, ${coords.lng}° E (Live GPS)`);
          resolve(coords);
        },
        (err) => {
          console.warn("GPS access notice:", err.message);
          setStatus("denied");
          setError("GPS access was denied or timed out. Defaulting to Central Corridor coordinates.");
          setIsReal(false);
          const fallback = {
            lat: HYDERABAD_FALLBACK_COORDINATES[0],
            lng: HYDERABAD_FALLBACK_COORDINATES[1],
          };
          setCoordinates(fallback);
          setAccuracy(null);
          setFormattedAddress("Hyderabad Central Corridor (Default)");
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

  // Ask for user location immediately while accessing the app
  React.useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      requestLocation();
    }
  }, [requestLocation]);

  const setCustomCoordinates = useCallback((coords: LocationCoordinates) => {
    setCoordinates(coords);
    setIsReal(true);
    setFormattedAddress(`${coords.lat.toFixed(5)}° N, ${coords.lng.toFixed(5)}° E (Pinned Location)`);
  }, []);

  return (
    <LocationContext.Provider
      value={{
        coordinates,
        status,
        isReal,
        accuracy,
        error,
        formattedAddress,
        requestLocation,
        setCustomCoordinates,
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
