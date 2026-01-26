"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { getWeekDates } from "@/lib/utils";

export function useScheduleDates() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const weekDates = getWeekDates(currentDate);

  // Reorder weekDates to start from Monday
  const orderedWeekDates = useMemo(() => {
    const mondayIndex = weekDates.findIndex((d) => d.getDay() === 1);
    if (mondayIndex === -1) return weekDates;
    return [...weekDates.slice(mondayIndex), ...weekDates.slice(0, mondayIndex)];
  }, [weekDates]);

  const navigate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    const offset = viewMode === "week" ? 7 : 1;
    newDate.setDate(newDate.getDate() + (direction === "next" ? offset : -offset));
    setCurrentDate(newDate);
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

  const formatDayDate = () => {
    const dayName = currentDate.toLocaleDateString("en-GB", { weekday: "long" });
    const month = currentDate.toLocaleDateString("en-GB", { month: "long" });
    const day = currentDate.getDate();
    const year = currentDate.getFullYear();
    return `${dayName}, ${month} ${day}, ${year}`;
  };

  // Handle date picker selection
  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    if (!isNaN(selectedDate.getTime())) {
      setCurrentDate(selectedDate);
    }
    setShowDatePicker(false);
  };

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateInputRef.current && !dateInputRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    if (showDatePicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDatePicker]);

  return {
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
  };
}
