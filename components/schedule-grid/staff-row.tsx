"use client";

import React, { memo } from "react";
import { cn, isSameDay } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import { ShiftCard } from "./shift-card";
import type { Shift, User, Holiday } from "./types";

interface StaffRowProps {
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
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
  rowRef?: (node: HTMLElement | null) => void;
  rowStyle?: React.CSSProperties;
}

export const StaffRow = memo(function StaffRow({
  user,
  currentUserId,
  isManager,
  viewMode,
  orderedWeekDates,
  currentDate,
  staffColumnWidth,
  enableDroppable,
  availabilityLength,
  onCellClick,
  onShiftSelect,
  totalHours,
  getShiftsForUserAndDate,
  isUserAvailable,
  getUserHolidayForDate,
  renderDroppableCell,
  renderAddShiftHint,
  dragHandleProps,
  isDragging,
  rowRef,
  rowStyle,
}: StaffRowProps) {
  const today = new Date();
  const isCurrentUser = user.id === currentUserId;

  const renderCellContent = (date: Date) => {
    const userShifts = getShiftsForUserAndDate(user.id, date);
    const hasAvailability = isUserAvailable(user.id, date);
    const hasNoAvailability = availabilityLength > 0 && !hasAvailability && userShifts.length === 0;
    const holiday = getUserHolidayForDate(user.id, date);

    return (
      <div className="relative group min-h-[100px]">
        <div className="space-y-2">
          {holiday && (
            <div className="w-full text-left px-3 py-2 rounded-md text-sm font-medium bg-purple-500 text-white shadow-md">
              <div className="font-bold">Holiday</div>
              <div className="text-xs opacity-80 mt-0.5">
                {holiday.hours}h off
              </div>
            </div>
          )}
          {userShifts.length > 0 ? (
            userShifts.map((shift) => (
              <ShiftCard key={shift.id} shift={shift} onSelect={onShiftSelect} />
            ))
          ) : !holiday && hasNoAvailability ? (
            <div className="text-xs text-gray-400 uppercase font-medium py-4 text-center">
              Unavailable
            </div>
          ) : null}
        </div>
        {isManager && renderAddShiftHint({ hasShifts: userShifts.length > 0 || !!holiday })}
      </div>
    );
  };

  const renderDateCell = (date: Date, index: number | null) => {
    const userShifts = getShiftsForUserAndDate(user.id, date);
    const hasAvailability = isUserAvailable(user.id, date);
    const hasNoAvailability = availabilityLength > 0 && !hasAvailability && userShifts.length === 0;
    const isToday = isSameDay(date, today);
    const cellContent = renderCellContent(date);

    if (enableDroppable) {
      return renderDroppableCell({
        date,
        userId: user.id,
        isToday,
        hasNoAvailability,
        children: cellContent,
        onClick: () => onCellClick(date, user.id),
      });
    }

    return (
      <td
        key={index ?? undefined}
        className={cn(
          "px-3 py-3 border-r last:border-r-0 align-top transition-colors",
          isToday && "bg-blue-50/50",
          hasNoAvailability && "bg-gray-100",
          isManager && "cursor-pointer"
        )}
        onClick={() => onCellClick(date, user.id)}
      >
        {cellContent}
      </td>
    );
  };

  return (
    <tr ref={rowRef} style={rowStyle} className={cn("border-b", isCurrentUser && "bg-blue-50/30", isDragging && "opacity-40")}>
      <td
        className="px-4 py-4 border-r sticky left-0 z-10 bg-white"
        style={{ width: staffColumnWidth, minWidth: staffColumnWidth }}
      >
        <div className="flex items-center gap-3">
          {dragHandleProps && (
            <button
              className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
              {...dragHandleProps}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0",
              isCurrentUser ? "bg-blue-500" : "bg-gray-400"
            )}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm text-gray-900 truncate">
              {user.name}
              {isCurrentUser && <span className="text-blue-500 ml-1">(You)</span>}
            </span>
            <span className="text-xs text-gray-500">
              {viewMode === "week" && (
                <>
                  {totalHours}h
                  {user.contractedHours && (
                    <span
                      className={cn(
                        "ml-1",
                        parseFloat(totalHours) >= user.contractedHours
                          ? "text-green-600"
                          : "text-amber-600"
                      )}
                    >
                      / {user.contractedHours}h
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
        </div>
      </td>
      {viewMode === "week"
        ? orderedWeekDates.map((date, i) => renderDateCell(date, i))
        : renderDateCell(currentDate, null)}
    </tr>
  );
});
