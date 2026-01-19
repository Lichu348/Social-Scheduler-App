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

  const categoryColor = template.category?.color;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-2 p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all",
        isDragging ? "opacity-50 shadow-lg z-50" : "hover:shadow-md",
        !categoryColor && "bg-card hover:bg-accent"
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />

      <div
        className="w-2 h-full absolute left-0 top-0 rounded-l-lg"
        style={{ backgroundColor: categoryColor || "#e5e7eb" }}
      />

      <div className="flex-1 pl-2 min-w-0">
        <p className="font-medium text-sm truncate">{template.name}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <Clock className="h-3 w-3" />
          <span>{template.startTime} - {template.endTime}</span>
        </div>
        {template.category && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
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
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded text-xs text-muted-foreground"
        >
          Edit
        </button>
      )}
    </div>
  );
}

// Drag overlay component for better visual feedback during drag
export function DraggableTemplateOverlay({ template }: { template: ShiftTemplate }) {
  const categoryColor = template.category?.color;

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border shadow-xl bg-card",
        "cursor-grabbing"
      )}
      style={{ width: 200 }}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />

      <div
        className="w-2 h-full absolute left-0 top-0 rounded-l-lg"
        style={{ backgroundColor: categoryColor || "#e5e7eb" }}
      />

      <div className="flex-1 pl-2 min-w-0">
        <p className="font-medium text-sm truncate">{template.name}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <Clock className="h-3 w-3" />
          <span>{template.startTime} - {template.endTime}</span>
        </div>
      </div>
    </div>
  );
}
