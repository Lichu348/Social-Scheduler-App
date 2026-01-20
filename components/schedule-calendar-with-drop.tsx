"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatTime, getWeekDates, getMonthDates, isSameDay } from "@/lib/utils";
import { ShiftDetailDialog } from "./shift-detail-dialog";
import { DroppableDayCell } from "./droppable-day-cell";

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
}

interface ScheduleCalendarWithDropProps {
  shifts: Shift[];
  users: User[];
  currentUserId: string;
  isManager: boolean;
  enableDroppable?: boolean;
}

export function ScheduleCalendarWithDrop({
  shifts,
  users,
  currentUserId,
  isManager,
  enableDroppable = false,
}: ScheduleCalendarWithDropProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const weekDates = getWeekDates(currentDate);
  const monthDates = getMonthDates(currentDate);

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (view === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getShiftsForDate = (date: Date) => {
    return shifts.filter((shift) => isSameDay(new Date(shift.startTime), date));
  };

  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const renderShift = (shift: Shift, compact = false) => {
    const isMyShift = shift.assignedTo?.id === currentUserId;
    const categoryColor = shift.category?.color;

    if (compact) {
      return (
        <button
          key={shift.id}
          onClick={() => setSelectedShift(shift)}
          className={cn(
            "w-full text-left p-1 rounded text-[10px] truncate",
            !categoryColor && isMyShift
              ? "bg-primary text-primary-foreground"
              : !categoryColor
              ? "bg-muted"
              : ""
          )}
          style={
            categoryColor
              ? {
                  backgroundColor: categoryColor,
                  color: "white",
                }
              : undefined
          }
        >
          {formatTime(shift.startTime)} {shift.title}
        </button>
      );
    }

    return (
      <button
        key={shift.id}
        onClick={() => setSelectedShift(shift)}
        className={cn(
          "w-full text-left p-2.5 rounded-md text-sm transition-colors shadow-sm",
          !categoryColor && isMyShift
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : !categoryColor && shift.isOpen
            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300"
            : !categoryColor
            ? "bg-muted hover:bg-muted/80"
            : ""
        )}
        style={
          categoryColor
            ? {
                backgroundColor: categoryColor,
                color: "white",
              }
            : undefined
        }
      >
        <p className="font-semibold truncate">{shift.title}</p>
        <p className="opacity-90 text-xs mt-0.5">
          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
        </p>
        {/* Show hours breakdown with break */}
        {(() => {
          const totalHours =
            (new Date(shift.endTime).getTime() -
              new Date(shift.startTime).getTime()) /
            (1000 * 60 * 60);
          const breakHours = (shift.scheduledBreakMinutes || 0) / 60;
          const paidHours = totalHours - breakHours;
          return (
            <div className="mt-1.5 py-1 px-1.5 rounded bg-black/10 text-xs">
              <span className="font-medium">{paidHours.toFixed(1)}h paid</span>
              {breakHours > 0 && (
                <span className="opacity-80">
                  {" "}
                  ({shift.scheduledBreakMinutes}m break)
                </span>
              )}
            </div>
          );
        })()}
        {shift.assignedTo && !isMyShift && (
          <p className="truncate opacity-80 mt-1.5 text-xs">{shift.assignedTo.name}</p>
        )}
        {shift.isOpen && (
          <Badge variant="warning" className="mt-1.5 text-xs">
            Open
          </Badge>
        )}
        {shift.category && (
          <p className="truncate opacity-80 text-xs mt-1">
            {shift.category.name}
          </p>
        )}
      </button>
    );
  };

  const DayCellWrapper = enableDroppable ? DroppableDayCell : "div";

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle>{formatMonthYear(currentDate)}</CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Tabs
                value={view}
                onValueChange={(v) => setView(v as "week" | "month")}
              >
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {view === "week" ? (
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((date, i) => {
                const dayShifts = getShiftsForDate(date);
                const isToday = isSameDay(date, today);

                const cellContent = (
                  <>
                    <div className="text-center mb-3 pb-2 border-b">
                      <p className="text-sm font-medium text-muted-foreground">
                        {dayNames[i]}
                      </p>
                      <p
                        className={cn(
                          "text-2xl font-bold",
                          isToday && "text-primary"
                        )}
                      >
                        {date.getDate()}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {dayShifts.map((shift) => renderShift(shift))}
                    </div>
                  </>
                );

                if (enableDroppable) {
                  return (
                    <DroppableDayCell
                      key={i}
                      date={date}
                      isToday={isToday}
                      className={cn(
                        "min-h-[320px] rounded-lg border p-3 transition-colors",
                        isToday && "bg-primary/5 border-primary"
                      )}
                    >
                      {cellContent}
                    </DroppableDayCell>
                  );
                }

                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-[320px] rounded-lg border p-3",
                      isToday && "bg-primary/5 border-primary"
                    )}
                  >
                    {cellContent}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDates.map((date, i) => {
                  const dayShifts = getShiftsForDate(date);
                  const isToday = isSameDay(date, today);
                  const isCurrentMonth =
                    date.getMonth() === currentDate.getMonth();

                  const cellContent = (
                    <>
                      <p
                        className={cn(
                          "text-xs font-medium mb-1",
                          isToday && "text-primary"
                        )}
                      >
                        {date.getDate()}
                      </p>
                      <div className="space-y-0.5">
                        {dayShifts.slice(0, 3).map((shift) =>
                          renderShift(shift, true)
                        )}
                        {dayShifts.length > 3 && (
                          <p className="text-[10px] text-muted-foreground text-center">
                            +{dayShifts.length - 3} more
                          </p>
                        )}
                      </div>
                    </>
                  );

                  if (enableDroppable) {
                    return (
                      <DroppableDayCell
                        key={i}
                        date={date}
                        isToday={isToday}
                        isCurrentMonth={isCurrentMonth}
                        className={cn(
                          "min-h-[140px] rounded border p-2 transition-colors",
                          isToday && "bg-primary/5 border-primary"
                        )}
                      >
                        {cellContent}
                      </DroppableDayCell>
                    );
                  }

                  return (
                    <div
                      key={i}
                      className={cn(
                        "min-h-[140px] rounded border p-2",
                        isToday && "bg-primary/5 border-primary",
                        !isCurrentMonth && "opacity-40"
                      )}
                    >
                      {cellContent}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedShift && (
        <ShiftDetailDialog
          shift={selectedShift}
          users={users}
          currentUserId={currentUserId}
          isManager={isManager}
          onClose={() => setSelectedShift(null)}
        />
      )}
    </>
  );
}
