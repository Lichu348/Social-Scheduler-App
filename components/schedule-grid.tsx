"use client";

import { useState, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn, formatTime, getWeekDates, isSameDay } from "@/lib/utils";
import { ShiftDetailDialog } from "./shift-detail-dialog";
import { QuickAddShiftDialog } from "./quick-add-shift-dialog";

interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
}

interface Shift {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  isOpen: boolean;
  scheduledBreakMinutes?: number;
  assignedTo: { id: string; name: string; email: string } | null;
  category?: ShiftCategory | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  staffRole?: string;
}

interface Availability {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate?: string | null;
}

interface Location {
  id: string;
  name: string;
}

interface Holiday {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  hours: number;
  reason: string | null;
}

interface ScheduleGridProps {
  shifts: Shift[];
  users: User[];
  currentUserId: string;
  isManager: boolean;
  availability?: Availability[];
  locationId?: string | null;
  enableDroppable?: boolean;
  categories?: ShiftCategory[];
  locations?: Location[];
  holidays?: Holiday[];
}

// Droppable cell component for drag-and-drop
function DroppableGridCell({
  date,
  userId,
  isToday,
  isManager,
  hasNoAvailability,
  children,
  onClick,
}: {
  date: Date;
  userId: string | null;
  isToday: boolean;
  isManager: boolean;
  hasNoAvailability?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${userId || "open"}-${date.toISOString()}`,
    data: {
      type: "grid-cell",
      date,
      userId,
    },
  });

  return (
    <td
      ref={setNodeRef}
      className={cn(
        "px-3 py-3 border-r last:border-r-0 align-top transition-colors",
        isToday && "bg-blue-50/50",
        hasNoAvailability && "bg-gray-100",
        isManager && "cursor-pointer hover:bg-gray-50",
        isOver && "bg-green-100 ring-2 ring-green-400 ring-inset"
      )}
      onClick={onClick}
    >
      {children}
    </td>
  );
}

export function ScheduleGrid({
  shifts,
  users,
  currentUserId,
  isManager,
  availability = [],
  locationId,
  enableDroppable = false,
  categories = [],
  locations = [],
  holidays = [],
}: ScheduleGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [quickAddData, setQuickAddData] = useState<{
    date: Date;
    userId: string | null;
  } | null>(null);

  const weekDates = getWeekDates(currentDate);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Reorder weekDates to start from Monday
  const orderedWeekDates = useMemo(() => {
    const mondayIndex = weekDates.findIndex((d) => d.getDay() === 1);
    if (mondayIndex === -1) return weekDates;
    return [...weekDates.slice(mondayIndex), ...weekDates.slice(0, mondayIndex)];
  }, [weekDates]);

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    setCurrentDate(newDate);
  };

  const getShiftsForUserAndDate = (userId: string | null, date: Date) => {
    return shifts.filter((shift) => {
      const shiftDate = new Date(shift.startTime);
      const sameDay = isSameDay(shiftDate, date);
      if (userId === null) {
        // Open shifts
        return sameDay && shift.isOpen;
      }
      return sameDay && shift.assignedTo?.id === userId;
    });
  };

  const getOpenShiftsForDate = (date: Date) => {
    return shifts.filter((shift) => {
      const shiftDate = new Date(shift.startTime);
      return isSameDay(shiftDate, date) && shift.isOpen;
    });
  };

  const isUserAvailable = (userId: string, date: Date) => {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split("T")[0];

    // Check for date-specific availability first
    const specificAvail = availability.find(
      (a) =>
        a.userId === userId &&
        !a.isRecurring &&
        a.specificDate?.split("T")[0] === dateStr
    );
    if (specificAvail) return true;

    // Check recurring availability
    const recurringAvail = availability.find(
      (a) => a.userId === userId && a.isRecurring && a.dayOfWeek === dayOfWeek
    );
    return !!recurringAvail;
  };

  const getUserHolidayForDate = (userId: string, date: Date): Holiday | null => {
    const dateStr = date.toISOString().split("T")[0];
    return holidays.find((h) => {
      if (h.userId !== userId) return false;
      const start = h.startDate.split("T")[0];
      const end = h.endDate.split("T")[0];
      return dateStr >= start && dateStr <= end;
    }) || null;
  };

  const getTotalHoursForUser = (userId: string) => {
    let totalMinutes = 0;
    orderedWeekDates.forEach((date) => {
      const userShifts = getShiftsForUserAndDate(userId, date);
      userShifts.forEach((shift) => {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        const breakMins = shift.scheduledBreakMinutes || 0;
        totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60) - breakMins;
      });
    });
    return (totalMinutes / 60).toFixed(2);
  };

  const formatDateRange = () => {
    const start = orderedWeekDates[0];
    const end = orderedWeekDates[6];
    const startMonth = start.toLocaleDateString("en-GB", { month: "short" });
    const endMonth = end.toLocaleDateString("en-GB", { month: "short" });
    const year = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
  };

  const today = new Date();

  const renderShiftCard = (shift: Shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const startStr = formatTime(start);
    const endStr = formatTime(end);
    const categoryName = shift.category?.name || "";
    const categoryColor = shift.category?.color || (shift.isOpen ? "#fbbf24" : "#6b7280");

    // Calculate if background is light or dark to determine text color
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 59, g: 130, b: 246 }; // default to blue
    };
    const rgb = hexToRgb(categoryColor);
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    const textColor = luminance > 0.5 ? "#1f2937" : "#ffffff";
    const textSecondaryColor = luminance > 0.5 ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)";

    return (
      <button
        key={shift.id}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedShift(shift);
        }}
        className="w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all hover:opacity-90 hover:shadow-lg shadow-md"
        style={{
          backgroundColor: categoryColor,
          color: textColor,
        }}
      >
        <div className="font-bold">{startStr} - {endStr}</div>
        {categoryName && (
          <div className="text-xs uppercase mt-0.5 truncate" style={{ color: textSecondaryColor }}>
            {categoryName}
          </div>
        )}
      </button>
    );
  };

  const handleCellClick = (date: Date, userId: string | null) => {
    if (!isManager) return;
    setQuickAddData({ date, userId });
  };

  return (
    <>
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">{formatDateRange()}</h2>
            <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            {/* Day Headers */}
            <thead>
              <tr className="border-b">
                <th className="w-52 px-4 py-3 text-left bg-gray-50 border-r sticky left-0 z-10">
                  <span className="text-sm font-medium text-gray-500">Staff</span>
                </th>
                {orderedWeekDates.map((date, i) => {
                  const isToday = isSameDay(date, today);
                  return (
                    <th
                      key={i}
                      className={cn(
                        "px-3 py-3 text-center border-r last:border-r-0 min-w-[160px] w-[14%]",
                        isToday && "bg-blue-50"
                      )}
                    >
                      <p className="text-xs font-medium text-gray-500 uppercase">{dayNames[i]}</p>
                      <p className={cn(
                        "text-lg font-semibold",
                        isToday ? "text-blue-600" : "text-gray-900"
                      )}>
                        {date.getDate()}
                      </p>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {/* Open Shifts Row */}
              <tr className="border-b bg-green-50/50">
                <td className="px-4 py-4 border-r bg-green-50 sticky left-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-green-800">Open Shifts</p>
                      <p className="text-xs text-green-600">Available to pick up</p>
                    </div>
                  </div>
                </td>
                {orderedWeekDates.map((date, i) => {
                  const openShifts = getOpenShiftsForDate(date);
                  const isToday = isSameDay(date, today);

                  const cellContent = (
                    <div className="space-y-2 min-h-[100px]">
                      {openShifts.map((shift) => renderShiftCard(shift))}
                    </div>
                  );

                  if (enableDroppable) {
                    return (
                      <DroppableGridCell
                        key={i}
                        date={date}
                        userId={null}
                        isToday={isToday}
                        isManager={isManager}
                        onClick={() => handleCellClick(date, null)}
                      >
                        {cellContent}
                      </DroppableGridCell>
                    );
                  }

                  return (
                    <td
                      key={i}
                      className={cn(
                        "px-3 py-3 border-r last:border-r-0 align-top",
                        isToday && "bg-blue-50/50",
                        isManager && "cursor-pointer hover:bg-green-100/50"
                      )}
                      onClick={() => handleCellClick(date, null)}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>

              {/* User Rows */}
              {users.map((user) => {
                const totalHours = getTotalHoursForUser(user.id);
                const isCurrentUser = user.id === currentUserId;

                return (
                  <tr key={user.id} className={cn("border-b", isCurrentUser && "bg-blue-50/30")}>
                    <td className="px-4 py-4 border-r sticky left-0 z-10 bg-white">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
                          isCurrentUser ? "bg-blue-500" : "bg-gray-400"
                        )}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.name}
                            {isCurrentUser && <span className="text-blue-500 ml-1">(You)</span>}
                          </p>
                          <p className="text-xs text-gray-500">{totalHours}h this week</p>
                        </div>
                      </div>
                    </td>
                    {orderedWeekDates.map((date, i) => {
                      const userShifts = getShiftsForUserAndDate(user.id, date);
                      const isToday = isSameDay(date, today);
                      const hasAvailability = isUserAvailable(user.id, date);
                      const hasNoAvailability = availability.length > 0 && !hasAvailability && userShifts.length === 0;
                      const holiday = getUserHolidayForDate(user.id, date);

                      const cellContent = (
                        <div className="space-y-2 min-h-[100px]">
                          {holiday && (
                            <div className="w-full text-left px-3 py-2 rounded-md text-sm font-medium bg-purple-500 text-white shadow-md">
                              <div className="font-bold">Holiday</div>
                              <div className="text-xs opacity-80 mt-0.5">
                                {holiday.hours}h off
                              </div>
                            </div>
                          )}
                          {userShifts.length > 0 ? (
                            userShifts.map((shift) => renderShiftCard(shift))
                          ) : !holiday && hasNoAvailability ? (
                            <div className="text-xs text-gray-400 uppercase font-medium py-4 text-center">
                              Unavailable
                            </div>
                          ) : null}
                        </div>
                      );

                      if (enableDroppable) {
                        return (
                          <DroppableGridCell
                            key={i}
                            date={date}
                            userId={user.id}
                            isToday={isToday}
                            isManager={isManager}
                            hasNoAvailability={hasNoAvailability}
                            onClick={() => handleCellClick(date, user.id)}
                          >
                            {cellContent}
                          </DroppableGridCell>
                        );
                      }

                      return (
                        <td
                          key={i}
                          className={cn(
                            "px-3 py-3 border-r last:border-r-0 align-top transition-colors",
                            isToday && "bg-blue-50/50",
                            hasNoAvailability && "bg-gray-100",
                            isManager && "cursor-pointer hover:bg-gray-50"
                          )}
                          onClick={() => handleCellClick(date, user.id)}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift Detail Dialog */}
      {selectedShift && (
        <ShiftDetailDialog
          shift={selectedShift}
          users={users}
          currentUserId={currentUserId}
          isManager={isManager}
          categories={categories}
          locations={locations}
          onClose={() => setSelectedShift(null)}
        />
      )}

      {/* Quick Add Shift Dialog */}
      {quickAddData && isManager && (
        <QuickAddShiftDialog
          date={quickAddData.date}
          userId={quickAddData.userId}
          users={users}
          locationId={locationId}
          onClose={() => setQuickAddData(null)}
        />
      )}
    </>
  );
}
