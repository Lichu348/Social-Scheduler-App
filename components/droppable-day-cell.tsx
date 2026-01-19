"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface DroppableDayCellProps {
  date: Date;
  children: React.ReactNode;
  className?: string;
  isToday?: boolean;
  isCurrentMonth?: boolean;
}

export function DroppableDayCell({
  date,
  children,
  className,
  isToday,
  isCurrentMonth = true,
}: DroppableDayCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${date.toISOString()}`,
    data: {
      type: "day",
      date,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && "ring-2 ring-primary ring-inset bg-primary/10",
        !isCurrentMonth && "opacity-40"
      )}
    >
      {children}
    </div>
  );
}
