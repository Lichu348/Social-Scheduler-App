"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock, Coffee, LogOut, AlertCircle, MapPin, Loader2 } from "lucide-react";

interface ClockInButtonProps {
  activeTimeEntry: {
    id: string;
    clockIn: Date;
    breakStart: Date | null;
  } | null;
  todayShift: {
    id: string;
  } | null;
}

export function ClockInButton({ activeTimeEntry, todayShift }: ClockInButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const getCurrentPosition = useCallback((): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          console.error("Geolocation error:", err);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  const handleClockIn = async () => {
    setLoading(true);
    setGettingLocation(true);
    setError(null);

    try {
      // Get current position
      const position = await getCurrentPosition();
      setGettingLocation(false);

      const res = await fetch("/api/time-entries/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: todayShift?.id,
          latitude: position?.latitude,
          longitude: position?.longitude,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        if (data.code === "LOCATION_REQUIRED") {
          setError("Please enable location services in your browser to clock in.");
        } else {
          setError(data.error || "Failed to clock in");
        }
      }
    } catch (err) {
      console.error("Clock in failed:", err);
      setError("Failed to clock in. Please try again.");
    } finally {
      setLoading(false);
      setGettingLocation(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch("/api/time-entries/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeEntryId: activeTimeEntry?.id }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.warning) {
          setWarning(data.warning);
        }
        router.refresh();
      } else {
        setError(data.error || "Failed to clock out");
      }
    } catch (err) {
      console.error("Clock out failed:", err);
      setError("Failed to clock out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBreak = async (action: "start" | "end") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/time-entries/break`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeEntryId: activeTimeEntry?.id,
          action,
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Break action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!activeTimeEntry) {
    return (
      <div className="space-y-3">
        {error && (
          <div className="flex items-start gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <Button
          size="lg"
          className="w-full h-16 text-lg"
          onClick={handleClockIn}
          disabled={loading}
        >
          {gettingLocation ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Getting location...
            </>
          ) : loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Clocking in...
            </>
          ) : (
            <>
              <Clock className="mr-2 h-5 w-5" />
              Clock In
            </>
          )}
        </Button>
      </div>
    );
  }

  const isOnBreak = activeTimeEntry.breakStart !== null;

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-start gap-2 p-3 text-sm text-yellow-700 bg-yellow-50 rounded-md">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}
      <div className="flex gap-3">
        <Button
          size="lg"
          variant={isOnBreak ? "default" : "outline"}
          className="flex-1 h-14"
          onClick={() => handleBreak(isOnBreak ? "end" : "start")}
          disabled={loading}
        >
          <Coffee className="mr-2 h-5 w-5" />
          {isOnBreak ? "End Break" : "Start Break"}
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="flex-1 h-14"
          onClick={handleClockOut}
          disabled={loading || isOnBreak}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Clock Out
        </Button>
      </div>
      {isOnBreak && (
        <p className="text-sm text-center text-muted-foreground">
          End your break before clocking out
        </p>
      )}
    </div>
  );
}
