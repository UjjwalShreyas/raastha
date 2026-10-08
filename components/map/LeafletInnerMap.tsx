"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [22, 36],
  iconAnchor: [11, 36],
  popupAnchor: [0, -32],
  shadowSize: [36, 36],
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

  return (
    <div className={`relative isolate z-0 ${className} overflow-hidden rounded-2xl border border-[#3E000C]/15`}>
      <MapContainer
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
            key={`poly-${idx}`}
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
            key={marker.id || `marker-${idx}`}
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
