"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const STAFF_COLUMN_WIDTH_KEY = "schedule-staff-column-width";
const DEFAULT_STAFF_COLUMN_WIDTH = 200;
const MIN_STAFF_COLUMN_WIDTH = 150;
const MAX_STAFF_COLUMN_WIDTH = 400;

export function useColumnResize() {
  const [staffColumnWidth, setStaffColumnWidth] = useState(DEFAULT_STAFF_COLUMN_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Load saved column width from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STAFF_COLUMN_WIDTH_KEY);
    if (saved) {
      const width = parseInt(saved, 10);
      if (!isNaN(width) && width >= MIN_STAFF_COLUMN_WIDTH && width <= MAX_STAFF_COLUMN_WIDTH) {
        setStaffColumnWidth(width);
      }
    }
  }, []);

  // Handle resize drag
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = { startX: e.clientX, startWidth: staffColumnWidth };
  }, [staffColumnWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const diff = e.clientX - resizeRef.current.startX;
      const newWidth = Math.min(
        MAX_STAFF_COLUMN_WIDTH,
        Math.max(MIN_STAFF_COLUMN_WIDTH, resizeRef.current.startWidth + diff)
      );
      setStaffColumnWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(STAFF_COLUMN_WIDTH_KEY, staffColumnWidth.toString());
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, staffColumnWidth]);

  return { staffColumnWidth, isResizing, handleResizeMouseDown };
}
