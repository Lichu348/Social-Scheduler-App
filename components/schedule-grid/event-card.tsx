"use client";

import { Cake, Users, GraduationCap, Trophy, CalendarDays } from "lucide-react";
import { formatTime } from "@/lib/utils";
import type { Event } from "./types";

interface EventCardProps {
  event: Event;
  onSelect: (event: Event) => void;
}

export function getEventIcon(eventType: string) {
  switch (eventType) {
    case "PARTY":
      return Cake;
    case "GROUP":
      return Users;
    case "TRAINING":
      return GraduationCap;
    case "COMPETITION":
      return Trophy;
    default:
      return CalendarDays;
  }
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 245, g: 158, b: 11 };
}

function getLuminance(hex: string) {
  const rgb = hexToRgb(hex);
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

export function EventCard({ event, onSelect }: EventCardProps) {
  const Icon = getEventIcon(event.eventType);
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);
  const startStr = formatTime(startDate);
  const endStr = formatTime(endDate);

  const luminance = getLuminance(event.color);
  const textColor = luminance > 0.5 ? "#1f2937" : "#ffffff";
  const textSecondaryColor = luminance > 0.5 ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)";

  return (
    <button
      key={event.id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event);
      }}
      className="w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all hover:opacity-90 hover:shadow-lg shadow-md border-2 border-dashed"
      style={{
        backgroundColor: event.color,
        color: textColor,
        borderColor: luminance > 0.5 ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.4)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="font-bold truncate">{event.title}</span>
      </div>
      <div className="text-xs mt-0.5" style={{ color: textSecondaryColor }}>
        {startStr} - {endStr}
      </div>
      <div className="flex gap-2 mt-1 text-xs" style={{ color: textSecondaryColor }}>
        {event.expectedGuests && (
          <span className="flex items-center gap-0.5">
            <Users className="h-3 w-3" />
            {event.expectedGuests}
          </span>
        )}
        {event.staffRequired && (
          <span className="flex items-center gap-0.5">
            +{event.staffRequired} staff
          </span>
        )}
      </div>
    </button>
  );
}
