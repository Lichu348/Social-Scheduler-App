"use client";

import { formatTime } from "@/lib/utils";
import type { Shift } from "./types";

interface ShiftCardProps {
  shift: Shift;
  onSelect: (shift: Shift) => void;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 59, g: 130, b: 246 }; // default to blue
}

function getLuminance(hex: string) {
  const rgb = hexToRgb(hex);
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

export function ShiftCard({ shift, onSelect }: ShiftCardProps) {
  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);
  const startStr = formatTime(start);
  const endStr = formatTime(end);
  const categoryName = shift.category?.name || "";
  const categoryColor = shift.category?.color || (shift.isOpen ? "#fbbf24" : "#6b7280");

  const luminance = getLuminance(categoryColor);
  const textColor = luminance > 0.5 ? "#1f2937" : "#ffffff";
  const textSecondaryColor = luminance > 0.5 ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)";

  return (
    <button
      key={shift.id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(shift);
      }}
      className="w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all hover:opacity-90 hover:shadow-lg shadow-md"
      style={{
        backgroundColor: categoryColor,
        color: textColor,
      }}
    >
      <div className="font-bold">
        {startStr} - {endStr}
      </div>
      {categoryName && (
        <div className="text-xs uppercase mt-0.5 truncate" style={{ color: textSecondaryColor }}>
          {categoryName}
        </div>
      )}
    </button>
  );
}
