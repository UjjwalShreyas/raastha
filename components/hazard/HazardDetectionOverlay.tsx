"use client";

import React, { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, Crosshair, Target } from "lucide-react";
import { BoundingBox } from "@/lib/roboflowClient";

interface HazardDetectionOverlayProps {
  photoUrl: string;
  detections?: BoundingBox[];
  isScanning?: boolean;
  engine?: "roboflow" | "gemini" | "fallback";
}

export function HazardDetectionOverlay({
  photoUrl,
  detections = [],
  isScanning = false,
  engine = "roboflow",
}: HazardDetectionOverlayProps) {
  const [showBoxes, setShowBoxes] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [imgDims, setImgDims] = useState<{ width: number; height: number }>({
    width: 600,
    height: 400,
  });

  const imgRef = useRef<HTMLImageElement>(null);

  // Update intrinsic image dimensions when photo changes
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const naturalWidth = e.currentTarget.naturalWidth || 600;
    const naturalHeight = e.currentTarget.naturalHeight || 400;
    setImgDims({ width: naturalWidth, height: naturalHeight });
  };

  const hasDetections = detections && detections.length > 0;
  const baseW = imgDims.width;
  const baseH = imgDims.height;

  return (
    <div className="w-full flex justify-center items-center select-none py-1">
      {/* Tightly-fitted Relative Media Container: Exactly mirrors the image aspect ratio */}
      <div className="relative inline-block max-w-full rounded-2xl overflow-hidden border border-[#3E000C]/20 bg-[#1e1e24] shadow-md group">
        {/* Base Image with high fidelity rendering */}
        <img
          ref={imgRef}
          src={photoUrl}
          alt="Hazard inspection"
          onLoad={handleImageLoad}
          className="block max-w-full max-h-[380px] w-auto h-auto object-contain rounded-2xl transition-transform duration-300 mx-auto"
        />

        {/* High-Precision Synchronized SVG Bounding Box Overlay */}
        {hasDetections && showBoxes && !isScanning && (
          <svg
            viewBox={`0 0 ${baseW} ${baseH}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-auto"
          >
            <defs>
              <radialGradient id="potholeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff4757" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#ff4757" stopOpacity="0.0" />
              </radialGradient>
              <filter id="boxShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.7" />
              </filter>
            </defs>

            {detections.map((det, idx) => {
              const isHovered = hoveredIndex === idx;

              // Defensive Normalization: Support 0..1 normalized floats, 600x400 preset coords, or original pixel coords
              const isNormalized =
                det.x <= 1 && det.y <= 1 && det.width <= 1 && det.height <= 1;

              const detX = isNormalized ? det.x * baseW : det.x;
              const detY = isNormalized ? det.y * baseH : det.y;
              const detW = isNormalized ? det.width * baseW : det.width;
              const detH = isNormalized ? det.height * baseH : det.height;

              // Roboflow detection coordinates are centered (x, y) with width & height
              const x = Math.max(0, Math.round(detX - detW / 2));
              const y = Math.max(0, Math.round(detY - detH / 2));
              const w = Math.min(baseW - x, Math.round(detW || baseW * 0.3));
              const h = Math.min(baseH - y, Math.round(detH || baseH * 0.25));

              const conf = Math.round((det.confidence || 0.9) * 100);
              const labelText = `⚡ ${det.class || "Pothole"} ${conf}%`;
              const labelWidth = Math.max(105, labelText.length * 7.5);
              const labelHeight = 22;
              const labelY = y >= labelHeight + 4 ? y - labelHeight - 2 : y + 4;

              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer transition-all duration-200"
                >
                  {/* Subtle target radial highlight */}
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="url(#potholeGlow)"
                    rx="8"
                    className="transition-opacity duration-200"
                    opacity={isHovered ? 0.95 : 0.65}
                  />

                  {/* Outer Bounding Box */}
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx="8"
                    fill="none"
                    stroke={isHovered ? "#ff2a2a" : "#ff4d4f"}
                    strokeWidth={isHovered ? "3.5" : "2.5"}
                    strokeDasharray={isHovered ? "none" : "8 5"}
                    filter="url(#boxShadow)"
                    className="transition-all duration-150"
                  />

                  {/* Precision Corner Crosshair Brackets */}
                  <g stroke="#ffffff" strokeWidth="3.5" fill="none" strokeLinecap="round">
                    {/* Top-Left */}
                    <path d={`M ${x} ${y + 14} L ${x} ${y} L ${x + 14} ${y}`} />
                    {/* Top-Right */}
                    <path d={`M ${x + w - 14} ${y} L ${x + w} ${y} L ${x + w} ${y + 14}`} />
                    {/* Bottom-Left */}
                    <path d={`M ${x} ${y + h - 14} L ${x} ${y + h} L ${x + 14} ${y + h}`} />
                    {/* Bottom-Right */}
                    <path d={`M ${x + w - 14} ${y + h} L ${x + w} ${y + h} L ${x + w} ${y + h - 14}`} />
                  </g>

                  {/* Center Target Reticle on Hover */}
                  {isHovered && (
                    <g stroke="#ff4d4f" strokeWidth="2" opacity="0.85">
                      <line x1={x + w / 2 - 12} y1={y + h / 2} x2={x + w / 2 + 12} y2={y + h / 2} />
                      <line x1={x + w / 2} y1={y + h / 2 - 12} x2={x + w / 2} y2={y + h / 2 + 12} />
                      <circle cx={x + w / 2} cy={y + h / 2} r="5" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                    </g>
                  )}

                  {/* Pill Label Tag */}
                  <g filter="url(#boxShadow)">
                    <rect
                      x={x}
                      y={labelY}
                      width={labelWidth}
                      height={labelHeight}
                      rx="6"
                      fill="#3E000C"
                      stroke="#FFECD1"
                      strokeWidth="1.2"
                    />
                    <text
                      x={x + 8}
                      y={labelY + 15}
                      fill="#FFECD1"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {labelText}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        )}

        {/* Top Floating Badge: Engine Indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-[#3E000C]/90 backdrop-blur-md text-[#FFECD1] border border-[#FFECD1]/25 flex items-center gap-1.5 shadow-md">
            <Target className="w-3.5 h-3.5 text-[#FFECD1]" />
            <span>
              {engine === "roboflow"
                ? "Roboflow RF-DETR Model"
                : engine === "gemini"
                ? "Gemini 2.5 Flash Vision"
                : "AI Detection Engine"}
            </span>
          </span>

          {hasDetections && (
            <button
              type="button"
              onClick={() => setShowBoxes(!showBoxes)}
              className="pointer-events-auto px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-white/95 backdrop-blur-md text-[#3E000C] border border-[#3E000C]/20 hover:bg-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {showBoxes ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-[#3E000C]" />
                  <span>Hide Markers ({detections.length})</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-[#3E000C]" />
                  <span>Show Markers ({detections.length})</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Bottom Floating Badge: Localized Detections Summary */}
        {hasDetections && showBoxes && !isScanning && (
          <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl text-[10px] font-bold bg-emerald-800/95 backdrop-blur-md text-white border border-emerald-400/30 flex items-center gap-1.5 shadow-md pointer-events-none">
            <Crosshair className="w-3.5 h-3.5 text-emerald-300" />
            <span>{detections.length} Target{detections.length > 1 ? "s" : ""} Aligned</span>
          </div>
        )}
      </div>
    </div>
  );
}
