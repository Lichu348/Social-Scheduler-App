"use client";

import { Plus, CalendarDays } from "lucide-react";
import { cn, isSameDay } from "@/lib/utils";
import { ShiftCard } from "./shift-card";
import type { Shift } from "./types";

interface OpenShiftsRowProps {
  viewMode: "day" | "week";
  orderedWeekDates: Date[];
  currentDate: Date;
  staffColumnWidth: number;
  isManager: boolean;
  enableDroppable: boolean;
  onCellClick: (date: Date, userId: string | null) => void;
  onShiftSelect: (shift: Shift) => void;
  getOpenShiftsForDate: (date: Date) => Shift[];
  renderDroppableCell: (props: {
    date: Date;
    userId: null;
    isToday: boolean;
    children: React.ReactNode;
    onClick: () => void;
  }) => React.ReactNode;
  renderAddShiftHint: (props: { hasShifts: boolean }) => React.ReactNode;
}

export function OpenShiftsRow({
  viewMode,
  orderedWeekDates,
  currentDate,
  staffColumnWidth,
  isManager,
  enableDroppable,
  onCellClick,
  onShiftSelect,
  getOpenShiftsForDate,
  renderDroppableCell,
  renderAddShiftHint,
}: OpenShiftsRowProps) {
  const today = new Date();

  const renderCellContent = (date: Date) => {
    const openShifts = getOpenShiftsForDate(date);
    return (
      <div className="relative group min-h-[100px]">
        <div className="space-y-2">
          {openShifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} onSelect={onShiftSelect} />
          ))}
        </div>
        {isManager && renderAddShiftHint({ hasShifts: openShifts.length > 0 })}
      </div>
    );
  };

  const renderDateCell = (date: Date, index: number | null) => {
    const isToday = isSameDay(date, today);
    const cellContent = renderCellContent(date);

    if (enableDroppable) {
      return renderDroppableCell({
        date,
        userId: null,
        isToday,
        children: cellContent,
        onClick: () => onCellClick(date, null),
      });
    }

    return (
      <td
        key={index ?? undefined}
        className={cn(
          "px-3 py-3 border-r last:border-r-0 align-top",
          isToday && "bg-blue-50/50",
          isManager && "cursor-pointer"
        )}
        onClick={() => onCellClick(date, null)}
      >
        {cellContent}
      </td>
    );
  };

  return (
    <tr className="border-b bg-green-50/50">
      <td
        className="px-4 py-4 border-r bg-green-50 sticky left-0 z-10"
        style={{ width: staffColumnWidth, minWidth: staffColumnWidth }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-green-800 truncate">Open Shifts</p>
            <p className="text-xs text-green-600 truncate">Available to pick up</p>
          </div>
        </div>
      </td>
      {viewMode === "week"
        ? orderedWeekDates.map((date, i) => renderDateCell(date, i))
        : renderDateCell(currentDate, null)}
    </tr>
  );
}
