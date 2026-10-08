"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Bundle Leaflet marker icons locally from /images/leaflet/ (no external unpkg CDN)
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/images/leaflet/marker-icon-2x.png",
    iconUrl: "/images/leaflet/marker-icon.png",
    shadowUrl: "/images/leaflet/marker-shadow.png",
  });
}

const defaultPinSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 26 38">
  <path d="M13 1C6.37 1 1 6.37 1 13c0 9.5 12 24 12 24s12-14.5 12-24c0-6.63-5.37-12-12-12z" fill="#3E000C" stroke="#FFECD1" stroke-width="2"/>
  <circle cx="13" cy="13" r="5" fill="#FFECD1"/>
</svg>
`)}`;

const defaultIcon = L.icon({
  iconUrl: defaultPinSvg,
  iconSize: [26, 38],
  iconAnchor: [13, 38],
  popupAnchor: [0, -36],
});

export interface MapMarkerData {
  id?: string;
  lat: number;
  lng: number;
  title?: string;
  type?: string;
  severity?: number;
  description?: string;
}

export interface MapPolylineData {
  positions: [number, number][];
  color: string;
  name?: string;
  weight?: number;
  dashArray?: string;
}

export interface MapProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarkerData[];
  polylines?: MapPolylineData[];
  className?: string;
  interactive?: boolean;
}

function MapAutoBounds({
  center,
  polylines,
  markers,
}: {
  center: [number, number];
  polylines?: MapPolylineData[];
  markers?: MapMarkerData[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    try {
      if (polylines && polylines.length > 0 && polylines[0].positions.length > 0) {
        const allPoints: [number, number][] = [];
        polylines.forEach((poly) => {
          poly.positions.forEach((pt) => allPoints.push(pt));
        });
        if (allPoints.length > 1) {
          const bounds = L.latLngBounds(allPoints);
          map.fitBounds(bounds, { padding: [35, 35] });
          return;
        }
      }

      if (markers && markers.length > 1) {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [45, 45] });
        return;
      }

      map.setView(center, map.getZoom() || 14);
    } catch {
      // Safe fallback if container is being resized during HMR
    }
  }, [center, polylines, markers, map]);

  return null;
}

export default function LeafletInnerMap({
  center,
  zoom = 14,
  markers = [],
  polylines = [],
  className = "w-full h-full",
}: MapProps) {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [mapKey, setMapKey] = useState<number>(0);

  useEffect(() => {
    setIsMounted(true);
    setMapKey((k) => k + 1);
  }, []);

  const createCustomIcon = (type?: string, severity?: number) => {
    let bgColor = "#3E000C";
    let textColor = "#FFECD1";
    let label = "•";

    if (type?.toLowerCase().includes("pothole")) {
      label = "🕳️";
    } else if (type?.toLowerCase().includes("light")) {
      label = "💡";
    } else if (type?.toLowerCase().includes("manhole")) {
      label = "⚠️";
    } else if (type?.toLowerCase().includes("water")) {
      label = "🌊";
    } else if (type?.toLowerCase().includes("harassment") || type?.toLowerCase().includes("dark")) {
      label = "🛡️";
    } else if (type === "start") {
      bgColor = "#3E000C";
      textColor = "#FFECD1";
      label = "📍";
    } else if (type === "destination") {
      bgColor = "#3E000C";
      textColor = "#FFECD1";
      label = "🎯";
    }

    return L.divIcon({
      className: "custom-map-marker",
      html: `
        <div style="
          background-color: ${bgColor};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${textColor};
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(62,0,12,0.3);
          border: 2px solid #FFECD1;
          transform: translate(-15px, -15px);
        ">
          ${label}
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  if (!isMounted) {
    return (
      <div className={`relative isolate z-0 ${className} overflow-hidden rounded-2xl border border-[#3E000C]/15 bg-[#FFECD1]/20 flex items-center justify-center min-h-[340px]`}>
        <span className="text-xs text-[#3E000C]/60 font-medium">Initializing Map Layers...</span>
      </div>
    );
  }

  return (
    <div className={`relative isolate z-0 ${className} overflow-hidden rounded-2xl border border-[#3E000C]/15`}>
      <MapContainer
        key={`leaflet-map-${mapKey}-${center[0]}-${center[1]}`}
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", minHeight: "340px", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapAutoBounds center={center} polylines={polylines} markers={markers} />

        {polylines.map((poly, idx) => (
          <Polyline
            key={`poly-${idx}-${poly.positions.length}`}
            positions={poly.positions}
            pathOptions={{
              color: poly.color || "#3E000C",
              weight: poly.weight || 5,
              opacity: 0.95,
              dashArray: poly.dashArray,
              lineJoin: "round",
            }}
          >
            {poly.name && (
              <Popup>
                <div className="font-semibold text-[#3E000C] text-xs">{poly.name}</div>
              </Popup>
            )}
          </Polyline>
        ))}

        {markers.map((marker, idx) => (
          <Marker
            key={marker.id || `marker-${idx}-${marker.lat}-${marker.lng}`}
            position={[marker.lat, marker.lng]}
            icon={marker.type ? createCustomIcon(marker.type, marker.severity) : defaultIcon}
          >
            <Popup>
              <div className="p-1 max-w-[200px] text-[#3E000C]">
                <div className="font-semibold text-xs text-[#3E000C]">
                  {marker.title || marker.type || "Hazard Point"}
                </div>
                {marker.type && (
                  <span className="inline-block px-1.5 py-0.5 mt-1 text-[10px] font-medium bg-[#3E000C]/10 text-[#3E000C] rounded border border-[#3E000C]/15">
                    {marker.type}
                  </span>
                )}
                {marker.severity && (
                  <p className="text-[11px] text-[#3E000C]/75 mt-1">
                    Severity: <strong className="text-[#3E000C]">{marker.severity}/5</strong>
                  </p>
                )}
                {marker.description && (
                  <p className="text-[11px] text-[#3E000C]/65 mt-1">{marker.description}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
