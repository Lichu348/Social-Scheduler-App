"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus, CalendarDays, GripVertical } from "lucide-react";
import { cn, isSameDay } from "@/lib/utils";
import { ShiftDetailDialog } from "./shift-detail-dialog";
import { QuickAddShiftDialog } from "./quick-add-shift-dialog";
import { QuickAddEventDialog } from "./quick-add-event-dialog";
import { EventDetailDialog } from "./event-detail-dialog";

import type {
  Shift,
  Event,
  Holiday,
  ScheduleGridProps,
} from "./schedule-grid/types";
import { calculateBreakMinutes } from "./schedule-grid/types";
import { useColumnResize } from "./schedule-grid/use-column-resize";
import { useScheduleDates } from "./schedule-grid/use-schedule-dates";
import { ScheduleHeader } from "./schedule-grid/schedule-header";
import { ShiftCard } from "./schedule-grid/shift-card";
import { EventCard } from "./schedule-grid/event-card";
import { StaffRow } from "./schedule-grid/staff-row";
import { SortableStaffRow } from "./schedule-grid/sortable-staff-row";
import { OpenShiftsRow } from "./schedule-grid/open-shifts-row";

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

// Hover hint component for adding shifts
const AddShiftHint = ({ hasShifts }: { hasShifts?: boolean }) => (
  <div
    className={cn(
      "hidden group-hover:flex items-center justify-center transition-all",
      hasShifts
        ? "mt-2 py-1.5 border border-dashed border-gray-300 rounded-md bg-gray-50/80"
        : "absolute inset-1 border-2 border-dashed border-gray-300 rounded-md bg-gray-50/80"
    )}
  >
    <div className="flex items-center gap-1 text-gray-500 text-xs font-medium">
      <Plus className="h-3 w-3" />
      Add Shift
    </div>
  </div>
);

// Hover hint component for adding events
const AddEventHint = ({ hasEvents }: { hasEvents?: boolean }) => (
  <div
    className={cn(
      "hidden group-hover:flex items-center justify-center transition-all",
      hasEvents
        ? "mt-2 py-1.5 border border-dashed border-amber-300 rounded-md bg-amber-50/80"
        : "absolute inset-1 border-2 border-dashed border-amber-300 rounded-md bg-amber-50/80"
    )}
  >
    <div className="flex items-center gap-1 text-amber-600 text-xs font-medium">
      <Plus className="h-3 w-3" />
      Add Event
    </div>
  </div>
);

export function ScheduleGrid({
  shifts,
  users,
  currentUserId,
  isManager,
  availability = [],
  locationId,
  enableDroppable = false,
  enableSortableRows = false,
  onUsersReordered,
  categories = [],
  locations = [],
  holidays = [],
  events = [],
  breakRules = "[]",
  breakCalculationMode = "PER_SHIFT",
}: ScheduleGridProps) {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [quickAddData, setQuickAddData] = useState<{
    date: Date;
    userId: string | null;
  } | null>(null);
  const [quickAddEventData, setQuickAddEventData] = useState<{ date: Date } | null>(null);

  const { staffColumnWidth, isResizing, handleResizeMouseDown } = useColumnResize();
  const {
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    showDatePicker,
    setShowDatePicker,
    dateInputRef,
    orderedWeekDates,
    navigate,
    formatDateRange,
    formatDayDate,
    handleDateSelect,
  } = useScheduleDates();

  const today = new Date();
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // --- Data lookup helpers ---

  const getShiftsForUserAndDate = (userId: string | null, date: Date) => {
    return shifts.filter((shift) => {
      const shiftDate = new Date(shift.startTime);
      const sameDay = isSameDay(shiftDate, date);
      if (userId === null) {
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const specificAvail = availability.find(
      (a) =>
        a.userId === userId &&
        !a.isRecurring &&
        a.specificDate?.split("T")[0] === dateStr
    );
    if (specificAvail) return true;

    const recurringAvail = availability.find(
      (a) => a.userId === userId && a.isRecurring && a.dayOfWeek === dayOfWeek
    );
    return !!recurringAvail;
  };

  const getUserHolidayForDate = (userId: string, date: Date): Holiday | null => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    return (
      holidays.find((h) => {
        if (h.userId !== userId) return false;
        const start = h.startDate.split("T")[0];
        const end = h.endDate.split("T")[0];
        return dateStr >= start && dateStr <= end;
      }) || null
    );
  };

  const getEventsForDate = (date: Date): Event[] => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    return events.filter((event) => {
      const eventStart = event.startTime.split("T")[0];
      const eventEnd = event.endTime.split("T")[0];
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  };

  const getTotalHoursForUser = (userId: string) => {
    let totalMinutes = 0;

    if (breakCalculationMode === "PER_DAY") {
      orderedWeekDates.forEach((date) => {
        const userShifts = getShiftsForUserAndDate(userId, date);
        let dayMinutes = 0;
        userShifts.forEach((shift) => {
          const start = new Date(shift.startTime);
          const end = new Date(shift.endTime);
          dayMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
        });
        if (dayMinutes > 0) {
          const dayHours = dayMinutes / 60;
          const dayBreakMinutes = calculateBreakMinutes(dayHours, breakRules);
          totalMinutes += dayMinutes - dayBreakMinutes;
        }
      });
    } else {
      orderedWeekDates.forEach((date) => {
        const userShifts = getShiftsForUserAndDate(userId, date);
        userShifts.forEach((shift) => {
          const start = new Date(shift.startTime);
          const end = new Date(shift.endTime);
          const breakMins = shift.scheduledBreakMinutes || 0;
          totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60) - breakMins;
        });
      });
    }
    return (totalMinutes / 60).toFixed(2);
  };

  // --- Event handlers ---

  const handleCellClick = (date: Date, userId: string | null) => {
    if (!isManager) return;
    setQuickAddData({ date, userId });
  };

  const handleEventCellClick = (date: Date) => {
    if (!isManager) return;
    setQuickAddEventData({ date });
  };

  // --- Render helpers for child components ---

  const renderDroppableCell = ({
    date,
    userId,
    isToday,
    hasNoAvailability,
    children,
    onClick,
  }: {
    date: Date;
    userId: string | null;
    isToday: boolean;
    hasNoAvailability?: boolean;
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <DroppableGridCell
      key={`droppable-${userId || "open"}-${date.toISOString()}`}
      date={date}
      userId={userId}
      isToday={isToday}
      isManager={isManager}
      hasNoAvailability={hasNoAvailability}
      onClick={onClick}
    >
      {children}
    </DroppableGridCell>
  );

  const renderAddShiftHint = ({ hasShifts }: { hasShifts: boolean }) => (
    <AddShiftHint hasShifts={hasShifts} />
  );

  return (
    <>
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {/* Header */}
        <ScheduleHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          navigate={navigate}
          formatDateRange={formatDateRange}
          formatDayDate={formatDayDate}
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
          dateInputRef={dateInputRef}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          handleDateSelect={handleDateSelect}
        />

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            {/* Day Headers */}
            <thead>
              <tr className="border-b">
                <th
                  className="px-4 py-3 text-left bg-gray-50 border-r sticky left-0 z-10 relative"
                  style={{ width: staffColumnWidth, minWidth: staffColumnWidth }}
                >
                  <span className="text-sm font-medium text-gray-500">Staff</span>
                  {/* Resize handle */}
                  <div
                    className={cn(
                      "absolute right-0 top-0 bottom-0 w-4 cursor-col-resize flex items-center justify-center hover:bg-gray-200 transition-colors group",
                      isResizing && "bg-blue-200"
                    )}
                    onMouseDown={handleResizeMouseDown}
                    title="Drag to resize"
                  >
                    <GripVertical className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                  </div>
                </th>
                {viewMode === "week" ? (
                  orderedWeekDates.map((date, i) => {
                    const isToday = isSameDay(date, today);
                    return (
                      <th
                        key={i}
                        className={cn(
                          "px-3 py-3 text-center border-r last:border-r-0 min-w-[120px] w-[14%]",
                          isToday && "bg-blue-50"
                        )}
                      >
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          {dayNames[i]}
                        </p>
                        <p
                          className={cn(
                            "text-lg font-semibold",
                            isToday ? "text-blue-600" : "text-gray-900"
                          )}
                        >
                          {date.getDate()}
                        </p>
                      </th>
                    );
                  })
                ) : (
                  <th
                    className={cn(
                      "px-4 py-3 text-center border-r",
                      isSameDay(currentDate, today) && "bg-blue-50"
                    )}
                  >
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      {currentDate.toLocaleDateString("en-GB", { weekday: "short" })}
                    </p>
                    <p
                      className={cn(
                        "text-lg font-semibold",
                        isSameDay(currentDate, today) ? "text-blue-600" : "text-gray-900"
                      )}
                    >
                      {currentDate.getDate()}
                    </p>
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {/* Events Row */}
              {(events.length > 0 || isManager) && (
                <tr className="border-b bg-amber-50/50">
                  <td
                    className="px-4 py-4 border-r bg-amber-50 sticky left-0 z-10"
                    style={{ width: staffColumnWidth, minWidth: staffColumnWidth }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                        <CalendarDays className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-amber-800 truncate">Events</p>
                        <p className="text-xs text-amber-600 truncate">
                          Parties, groups & bookings
                        </p>
                      </div>
                    </div>
                  </td>
                  {viewMode === "week" ? (
                    orderedWeekDates.map((date, i) => {
                      const dayEvents = getEventsForDate(date);
                      const isToday = isSameDay(date, today);
                      return (
                        <td
                          key={i}
                          className={cn(
                            "px-3 py-3 border-r last:border-r-0 align-top",
                            isToday && "bg-blue-50/50",
                            isManager && "cursor-pointer"
                          )}
                          onClick={() => handleEventCellClick(date)}
                        >
                          <div className="relative group min-h-[60px]">
                            <div className="space-y-2">
                              {dayEvents.map((event) => (
                                <EventCard
                                  key={event.id}
                                  event={event}
                                  onSelect={setSelectedEvent}
                                />
                              ))}
                            </div>
                            {isManager && <AddEventHint hasEvents={dayEvents.length > 0} />}
                          </div>
                        </td>
                      );
                    })
                  ) : (
                    <td
                      className={cn(
                        "px-4 py-3 border-r align-top",
                        isSameDay(currentDate, today) && "bg-blue-50/50",
                        isManager && "cursor-pointer"
                      )}
                      onClick={() => handleEventCellClick(currentDate)}
                    >
                      <div className="relative group min-h-[60px]">
                        <div className="space-y-2">
                          {getEventsForDate(currentDate).map((event) => (
                            <EventCard
                              key={event.id}
                              event={event}
                              onSelect={setSelectedEvent}
                            />
                          ))}
                        </div>
                        {isManager && (
                          <AddEventHint hasEvents={getEventsForDate(currentDate).length > 0} />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )}

              {/* Open Shifts Row */}
              <OpenShiftsRow
                viewMode={viewMode}
                orderedWeekDates={orderedWeekDates}
                currentDate={currentDate}
                staffColumnWidth={staffColumnWidth}
                isManager={isManager}
                enableDroppable={enableDroppable}
                onCellClick={handleCellClick}
                onShiftSelect={setSelectedShift}
                getOpenShiftsForDate={getOpenShiftsForDate}
                renderDroppableCell={renderDroppableCell}
                renderAddShiftHint={renderAddShiftHint}
              />

              {/* User Rows */}
              {users.map((user) => {
                const RowComponent = enableSortableRows ? SortableStaffRow : StaffRow;
                return (
                  <RowComponent
                    key={user.id}
                    user={user}
                    currentUserId={currentUserId}
                    isManager={isManager}
                    viewMode={viewMode}
                    orderedWeekDates={orderedWeekDates}
                    currentDate={currentDate}
                    staffColumnWidth={staffColumnWidth}
                    enableDroppable={enableDroppable}
                    availabilityLength={availability.length}
                    onCellClick={handleCellClick}
                    onShiftSelect={setSelectedShift}
                    totalHours={getTotalHoursForUser(user.id)}
                    getShiftsForUserAndDate={getShiftsForUserAndDate}
                    isUserAvailable={isUserAvailable}
                    getUserHolidayForDate={getUserHolidayForDate}
                    renderDroppableCell={renderDroppableCell}
                    renderAddShiftHint={renderAddShiftHint}
                  />
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

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <EventDetailDialog
          event={selectedEvent}
          isManager={isManager}
          locations={locations}
          onClose={() => setSelectedEvent(null)}
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

      {/* Quick Add Event Dialog */}
      {quickAddEventData && isManager && (
        <QuickAddEventDialog
          date={quickAddEventData.date}
          locationId={locationId}
          locations={locations}
          onClose={() => setQuickAddEventData(null)}
        />
      )}
    </>
  );
}
