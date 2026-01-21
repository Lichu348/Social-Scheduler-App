"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  Calendar,
  FileText,
  LogOut,
  Coffee,
  Loader2,
  AlertCircle,
  ArrowLeftRight,
  Trash2,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { formatDate, formatTime, calculateHours } from "@/lib/utils";
import { MobileSwapDropDialog } from "@/components/mobile-swap-drop-dialog";

interface Shift {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location: { id: string; name: string } | null;
  category: { id: string; name: string; color: string } | null;
}

interface TimeEntry {
  id: string;
  clockIn: Date;
  clockOut: Date | null;
  breakStart: Date | null;
  totalBreak: number;
  status: string;
  shift: { id: string; title: string } | null;
}

interface SwapRequest {
  id: string;
  type: string;
  status: string;
  shift: { id: string; title: string; startTime: Date; endTime: Date };
}

interface MobileStaffViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    staffRole: string;
  };
  upcomingShifts: Shift[];
  activeTimeEntry: (TimeEntry & { shift: { id: string; title: string } | null }) | null;
  monthTimeEntries: TimeEntry[];
  pendingSwapRequests: SwapRequest[];
  monthlyStats: {
    totalHoursWithBreaks: number;
    totalHoursWithoutBreaks: number;
    totalBreakMinutes: number;
    entriesCount: number;
  };
}

type TabType = "clock" | "shifts" | "timesheet";

export function MobileStaffView({
  user,
  upcomingShifts,
  activeTimeEntry: initialActiveTimeEntry,
  monthTimeEntries,
  pendingSwapRequests,
  monthlyStats,
}: MobileStaffViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("clock");
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTimeEntry, setActiveTimeEntry] = useState(initialActiveTimeEntry);

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
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  const handleClockIn = async () => {
    setLoading(true);
    setGettingLocation(true);
    setError(null);

    try {
      const position = await getCurrentPosition();
      setGettingLocation(false);

      // Find today's shift
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayShift = upcomingShifts.find((s) => {
        const shiftDate = new Date(s.startTime);
        return shiftDate >= today && shiftDate < tomorrow;
      });

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
        setActiveTimeEntry(data);
        router.refresh();
      } else {
        setError(data.error || "Failed to clock in");
      }
    } catch {
      setError("Failed to clock in. Please try again.");
    } finally {
      setLoading(false);
      setGettingLocation(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeTimeEntry) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/time-entries/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeEntryId: activeTimeEntry.id }),
      });

      if (res.ok) {
        setActiveTimeEntry(null);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to clock out");
      }
    } catch {
      setError("Failed to clock out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBreak = async (action: "start" | "end") => {
    if (!activeTimeEntry) return;
    setLoading(true);

    try {
      const res = await fetch("/api/time-entries/break", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeEntryId: activeTimeEntry.id, action }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveTimeEntry(data);
        router.refresh();
      }
    } catch {
      setError("Failed to update break status");
    } finally {
      setLoading(false);
    }
  };

  const isOnBreak = activeTimeEntry?.breakStart !== null;

  const formatDuration = (clockIn: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(clockIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const calculateEntryHours = (entry: TimeEntry) => {
    if (!entry.clockOut) return 0;
    const hours = calculateHours(entry.clockIn, entry.clockOut);
    return Math.max(0, hours - entry.totalBreak / 60);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">ShiftFlow</h1>
            <p className="text-sm opacity-90">{user.name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => router.push("/dashboard")}
          >
            Full Site
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {/* Clock Tab */}
        {activeTab === "clock" && (
          <div className="p-4 space-y-4">
            {/* Clock Status Card */}
            <Card className="border-2">
              <CardContent className="p-6">
                {error && (
                  <div className="flex items-start gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md mb-4">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {activeTimeEntry ? (
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      {isOnBreak ? "On Break" : "Clocked In"}
                    </div>

                    <div>
                      <p className="text-4xl font-bold">{formatDuration(activeTimeEntry.clockIn)}</p>
                      <p className="text-muted-foreground">
                        Since {formatTime(activeTimeEntry.clockIn)}
                      </p>
                    </div>

                    {activeTimeEntry.shift && (
                      <p className="text-sm text-muted-foreground">
                        Shift: {activeTimeEntry.shift.title}
                      </p>
                    )}

                    <div className="flex gap-3 pt-4">
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
                      <p className="text-sm text-muted-foreground">
                        End your break before clocking out
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground">
                      Not Clocked In
                    </div>

                    <p className="text-muted-foreground">Tap below to start your shift</p>

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
                )}
              </CardContent>
            </Card>

            {/* Today's Shift */}
            {upcomingShifts.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Today &amp; Upcoming</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {upcomingShifts.slice(0, 3).map((shift) => {
                    const isToday = new Date(shift.startTime).toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={shift.id}
                        className={`p-3 rounded-lg border ${isToday ? "border-primary bg-primary/5" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {isToday ? "Today" : formatDate(shift.startTime)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant="secondary"
                              style={shift.category ? { backgroundColor: shift.category.color + "20", color: shift.category.color } : {}}
                            >
                              {shift.title}
                            </Badge>
                            {shift.location && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                                <MapPin className="h-3 w-3" />
                                {shift.location.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setActiveTab("shifts")}
                  >
                    View all shifts
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Monthly Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{monthlyStats.totalHoursWithBreaks.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Hours (net)</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{monthlyStats.entriesCount}</p>
                    <p className="text-xs text-muted-foreground">Shifts worked</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Shifts Tab */}
        {activeTab === "shifts" && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-semibold">Your Shifts</h2>

            {/* Pending Requests */}
            {pendingSwapRequests.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-amber-800">Pending Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingSwapRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>
                        <p className="text-sm font-medium">{req.shift.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(req.shift.startTime)} - {req.type === "drop" ? "Drop" : "Swap"} request
                        </p>
                      </div>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Upcoming Shifts */}
            {upcomingShifts.length > 0 ? (
              <div className="space-y-3">
                {upcomingShifts.map((shift) => {
                  const isToday = new Date(shift.startTime).toDateString() === new Date().toDateString();
                  const hasPendingRequest = pendingSwapRequests.some((r) => r.shift.id === shift.id);

                  return (
                    <Card key={shift.id} className={isToday ? "border-primary" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{formatDate(shift.startTime)}</p>
                              {isToday && <Badge variant="default">Today</Badge>}
                            </div>
                            <p className="text-lg font-semibold">
                              {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                            </p>
                            <Badge
                              variant="secondary"
                              style={shift.category ? { backgroundColor: shift.category.color + "20", color: shift.category.color } : {}}
                            >
                              {shift.title}
                            </Badge>
                            {shift.location && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {shift.location.name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {!hasPendingRequest && (
                              <MobileSwapDropDialog
                                shiftId={shift.id}
                                shiftTitle={shift.title}
                                shiftDate={formatDate(shift.startTime)}
                              />
                            )}
                            {hasPendingRequest && (
                              <Badge variant="warning">Request pending</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No upcoming shifts scheduled
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Timesheet Tab */}
        {activeTab === "timesheet" && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-semibold">
              {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </h2>

            {/* Monthly Summary */}
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-3xl font-bold">{monthlyStats.totalHoursWithBreaks.toFixed(1)}</p>
                    <p className="text-sm opacity-90">Hours (with breaks deducted)</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{monthlyStats.totalHoursWithoutBreaks.toFixed(1)}</p>
                    <p className="text-sm opacity-90">Hours (total on site)</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-primary-foreground/20 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xl font-semibold">{monthlyStats.entriesCount}</p>
                    <p className="text-sm opacity-90">Shifts worked</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{Math.round(monthlyStats.totalBreakMinutes / 60 * 10) / 10}</p>
                    <p className="text-sm opacity-90">Hours on break</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Entries */}
            <div className="space-y-2">
              {monthTimeEntries.length > 0 ? (
                monthTimeEntries.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{formatDate(entry.clockIn)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(entry.clockIn)} - {entry.clockOut ? formatTime(entry.clockOut) : "Active"}
                          </p>
                          {entry.shift && (
                            <p className="text-xs text-muted-foreground">{entry.shift.title}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {entry.clockOut ? (
                            <>
                              <p className="text-lg font-semibold">
                                {calculateEntryHours(entry).toFixed(1)}h
                              </p>
                              {entry.totalBreak > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {entry.totalBreak}m break
                                </p>
                              )}
                              <Badge
                                variant={entry.status === "APPROVED" ? "success" : entry.status === "PENDING" ? "warning" : "secondary"}
                              >
                                {entry.status}
                              </Badge>
                            </>
                          ) : (
                            <Badge variant="success">Active</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No time entries this month
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t safe-area-inset-bottom">
        <div className="flex">
          <button
            onClick={() => setActiveTab("clock")}
            className={`flex-1 flex flex-col items-center py-3 ${
              activeTab === "clock" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Clock className="h-6 w-6" />
            <span className="text-xs mt-1">Clock</span>
          </button>
          <button
            onClick={() => setActiveTab("shifts")}
            className={`flex-1 flex flex-col items-center py-3 ${
              activeTab === "shifts" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Calendar className="h-6 w-6" />
            <span className="text-xs mt-1">Shifts</span>
          </button>
          <button
            onClick={() => setActiveTab("timesheet")}
            className={`flex-1 flex flex-col items-center py-3 ${
              activeTab === "timesheet" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <FileText className="h-6 w-6" />
            <span className="text-xs mt-1">Timesheet</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
