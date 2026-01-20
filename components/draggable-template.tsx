"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  defaultTitle?: string | null;
  category?: ShiftCategory | null;
}

interface DraggableTemplateProps {
  template: ShiftTemplate;
  onEdit?: (template: ShiftTemplate) => void;
}

// Helper function to determine text color based on background luminance
function getTextColors(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  const rgb = result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 107, g: 114, b: 128 }; // default gray
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return {
    text: luminance > 0.5 ? "#1f2937" : "#ffffff",
    secondary: luminance > 0.5 ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.75)"
  };
}

export function DraggableTemplate({ template, onEdit }: DraggableTemplateProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: template.id,
    data: {
      type: "template",
      template,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const categoryColor = template.category?.color || "#6b7280";
  const colors = getTextColors(categoryColor);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: categoryColor,
        color: colors.text,
      }}
      className={cn(
        "group relative flex items-center gap-2 p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all shadow-sm",
        isDragging ? "opacity-50 shadow-lg z-50" : "hover:shadow-md hover:opacity-90"
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4 flex-shrink-0" style={{ color: colors.secondary }} />

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{template.name}</p>
        <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: colors.secondary }}>
          <Clock className="h-3 w-3" />
          <span>{template.startTime} - {template.endTime}</span>
        </div>
        {template.category && (
          <p className="text-xs truncate mt-0.5" style={{ color: colors.secondary }}>
            {template.category.name}
          </p>
        )}
      </div>

      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(template);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-xs"
          style={{ color: colors.secondary, backgroundColor: "rgba(255,255,255,0.2)" }}
        >
          Edit
        </button>
      )}
    </div>
  );
}

// Drag overlay component for better visual feedback during drag
export function DraggableTemplateOverlay({ template }: { template: ShiftTemplate }) {
  const categoryColor = template.category?.color || "#6b7280";
  const colors = getTextColors(categoryColor);

  return (
    <div
      className="flex items-center gap-2 p-3 rounded-lg shadow-xl cursor-grabbing"
      style={{
        width: 200,
        backgroundColor: categoryColor,
        color: colors.text,
      }}
    >
      <GripVertical className="h-4 w-4 flex-shrink-0" style={{ color: colors.secondary }} />

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{template.name}</p>
        <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: colors.secondary }}>
          <Clock className="h-3 w-3" />
          <span>{template.startTime} - {template.endTime}</span>
        </div>
      </div>
    </div>
  );
}
