"use client";

import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import type { User } from "./types";

interface StaffRowDragOverlayProps {
  user: User;
}

export function StaffRowDragOverlay({ user }: StaffRowDragOverlayProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border shadow-lg w-[240px]">
      <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 bg-gray-400"
        )}
      >
        {user.name.charAt(0).toUpperCase()}
      </div>
      <span className="font-medium text-sm text-gray-900 truncate">
        {user.name}
      </span>
    </div>
  );
}
