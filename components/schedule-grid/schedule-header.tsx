"use client";

import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduleHeaderProps {
  viewMode: "day" | "week";
  setViewMode: (mode: "day" | "week") => void;
  navigate: (direction: "prev" | "next") => void;
  formatDateRange: () => string;
  formatDayDate: () => string;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  dateInputRef: RefObject<HTMLInputElement | null>;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  handleDateSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ScheduleHeader({
  viewMode,
  setViewMode,
  navigate,
  formatDateRange,
  formatDayDate,
  showDatePicker,
  setShowDatePicker,
  dateInputRef,
  currentDate,
  setCurrentDate,
  handleDateSelect,
}: ScheduleHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold min-w-[280px] text-center">
          {viewMode === "week" ? formatDateRange() : formatDayDate()}
        </h2>
        <Button variant="outline" size="icon" onClick={() => navigate("next")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {/* Calendar Date Picker */}
        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setShowDatePicker(!showDatePicker);
              // Focus the input when opening
              setTimeout(() => dateInputRef.current?.showPicker?.(), 0);
            }}
            title="Jump to date"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-1 z-50">
              <Input
                ref={dateInputRef}
                type="date"
                value={currentDate.toISOString().split("T")[0]}
                onChange={handleDateSelect}
                className="w-auto"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <div className="flex rounded-md border overflow-hidden">
          <button
            onClick={() => setViewMode("day")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "day"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            )}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors border-l",
              viewMode === "week"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            )}
          >
            Week
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
          Today
        </Button>
      </div>
    </div>
  );
}
