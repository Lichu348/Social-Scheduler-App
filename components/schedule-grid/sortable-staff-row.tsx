"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StaffRow } from "./staff-row";
import type { Shift, User, Holiday } from "./types";

interface SortableStaffRowProps {
  user: User;
  currentUserId: string;
  isManager: boolean;
  viewMode: "day" | "week";
  orderedWeekDates: Date[];
  currentDate: Date;
  staffColumnWidth: number;
  enableDroppable: boolean;
  availabilityLength: number;
  onCellClick: (date: Date, userId: string | null) => void;
  onShiftSelect: (shift: Shift) => void;
  totalHours: string;
  getShiftsForUserAndDate: (userId: string, date: Date) => Shift[];
  isUserAvailable: (userId: string, date: Date) => boolean;
  getUserHolidayForDate: (userId: string, date: Date) => Holiday | null;
  renderDroppableCell: (props: {
    date: Date;
    userId: string;
    isToday: boolean;
    hasNoAvailability: boolean;
    children: React.ReactNode;
    onClick: () => void;
  }) => React.ReactNode;
  renderAddShiftHint: (props: { hasShifts: boolean }) => React.ReactNode;
}

export function SortableStaffRow(props: SortableStaffRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.user.id,
    data: {
      type: "staff-row",
      user: props.user,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <StaffRow
      {...props}
      dragHandleProps={{ ...listeners, ...attributes }}
      isDragging={isDragging}
      rowRef={setNodeRef}
      rowStyle={style}
    />
  );
}
