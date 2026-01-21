import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime, calculateHours } from "@/lib/utils";
import { TimesheetActions } from "@/components/timesheet-actions";
import { ExportTimesheetDialog } from "@/components/export-timesheet-dialog";
import { Calendar, Banknote } from "lucide-react";

interface PayPeriod {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  payDate: Date | null;
  notes: string | null;
}

async function getTimeEntries(userId: string, organizationId: string, role: string) {
  const isManager = role === "MANAGER" || role === "ADMIN";

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return prisma.timeEntry.findMany({
    where: isManager
      ? { user: { organizationId } }
      : { userId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      shift: {
        select: { id: true, title: true, startTime: true },
      },
    },
    orderBy: { clockIn: "desc" },
    take: 50,
  });
}

async function getCurrentPayPeriod(organizationId: string): Promise<PayPeriod | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.payPeriod.findFirst({
    where: {
      organizationId,
      isActive: true,
      startDate: { lte: today },
      endDate: { gte: today },
    },
  });
}

async function getPayPeriodHours(userId: string, startDate: Date, endDate: Date): Promise<number> {
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      clockOut: { not: null },
      clockIn: {
        gte: startDate,
        lte: new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1), // End of endDate
      },
      status: { in: ["APPROVED", "PENDING"] }, // Count approved and pending hours
    },
    select: {
      clockIn: true,
      clockOut: true,
      totalBreak: true,
    },
  });

  return entries.reduce((total, entry) => {
    if (!entry.clockOut) return total;
    const hours = calculateHours(entry.clockIn, entry.clockOut);
    return total + Math.max(0, hours - entry.totalBreak / 60);
  }, 0);
}

export default async function TimesheetPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [entries, currentPayPeriod] = await Promise.all([
    getTimeEntries(session.user.id, session.user.organizationId, session.user.role),
    getCurrentPayPeriod(session.user.organizationId),
  ]);

  // Get hours for the current pay period (for the current user)
  let payPeriodHours = 0;
  if (currentPayPeriod) {
    payPeriodHours = await getPayPeriodHours(
      session.user.id,
      currentPayPeriod.startDate,
      currentPayPeriod.endDate
    );
  }

  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
  const pendingEntries = entries.filter((e) => e.status === "PENDING" && e.clockOut);
  const approvedEntries = entries.filter((e) => e.status === "APPROVED");
  const activeEntries = entries.filter((e) => !e.clockOut);
  const flaggedClockIns = entries.filter((e) => e.clockInFlag && !e.clockInApproved);

  const getStatusBadge = (status: string, clockOut: Date | null) => {
    if (!clockOut) {
      return <Badge variant="success">Active</Badge>;
    }
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
      case "APPROVED":
        return <Badge variant="success">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const calculateTotalHours = (entry: { clockIn: Date; clockOut: Date | null; totalBreak: number }) => {
    if (!entry.clockOut) return 0;
    const hours = calculateHours(entry.clockIn, entry.clockOut);
    return Math.max(0, hours - entry.totalBreak / 60);
  };

  const weeklyTotal = entries
    .filter((e) => e.clockOut)
    .reduce((total, entry) => total + calculateTotalHours(entry), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Timesheet</h1>
          <p className="text-muted-foreground mt-1">
            {isManager
              ? "Review and approve team time entries"
              : "Track your worked hours"}
          </p>
        </div>
        {isManager && <ExportTimesheetDialog />}
      </div>

      {/* Pay Period Card */}
      {currentPayPeriod && (
        <Card className="mb-6 border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">Current Pay Period</CardTitle>
            </div>
            <CardDescription className="text-green-700">
              {currentPayPeriod.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-white/70 border border-green-200">
                <p className="text-3xl font-bold text-green-700">{payPeriodHours.toFixed(2)}</p>
                <p className="text-sm text-green-600 font-medium">Hours This Period</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-white/70 border border-green-200">
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Period Dates</span>
                </div>
                <p className="text-sm mt-1 text-green-800">
                  {formatDate(currentPayPeriod.startDate)} - {formatDate(currentPayPeriod.endDate)}
                </p>
              </div>
              {currentPayPeriod.payDate && (
                <div className="text-center p-4 rounded-lg bg-white/70 border border-green-200">
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <Banknote className="h-4 w-4" />
                    <span className="text-sm font-medium">Pay Date</span>
                  </div>
                  <p className="text-sm mt-1 text-green-800 font-medium">
                    {formatDate(currentPayPeriod.payDate)}
                  </p>
                </div>
              )}
            </div>
            {currentPayPeriod.notes && (
              <p className="text-sm text-green-700 mt-3 italic">
                {currentPayPeriod.notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Your time tracking overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{weeklyTotal.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Hours (Recent)</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{entries.filter((e) => e.clockOut).length}</p>
              <p className="text-sm text-muted-foreground">Completed Entries</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{pendingEntries.length}</p>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
            </div>
            {isManager && flaggedClockIns.length > 0 && (
              <div className="text-center p-4 rounded-lg bg-amber-100">
                <p className="text-3xl font-bold text-amber-700">{flaggedClockIns.length}</p>
                <p className="text-sm text-amber-600">Flagged Clock-ins</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Entries */}
      {activeEntries.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Currently Clocked In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {isManager ? entry.user.name : "You"}
                      </span>
                      {getStatusBadge(entry.status, entry.clockOut)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Clocked in at {formatTime(entry.clockIn)} on {formatDate(entry.clockIn)}
                    </p>
                    {entry.breakStart && (
                      <Badge variant="secondary">On Break</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flagged Clock-ins (Manager only) */}
      {isManager && flaggedClockIns.length > 0 && (
        <Card className="mb-6 border-amber-200">
          <CardHeader className="bg-amber-50">
            <CardTitle className="text-amber-800">Flagged Clock-ins</CardTitle>
            <CardDescription className="text-amber-700">
              Early or late clock-ins that require your approval
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {flaggedClockIns.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-amber-200 bg-amber-50/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.user.name}</span>
                      <Badge variant="warning">
                        {entry.clockInFlag === "EARLY" ? "Early" : "Late"} Clock-in
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Clocked in at {formatTime(entry.clockIn)} on {formatDate(entry.clockIn)}
                    </p>
                    {entry.shift && (
                      <p className="text-xs text-amber-700">
                        Shift was scheduled for {formatTime(entry.shift.startTime)}
                      </p>
                    )}
                  </div>
                  <TimesheetActions entry={entry} showApprovalActions={true} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Approval */}
      {pendingEntries.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pending Approval</CardTitle>
            <CardDescription>
              {isManager
                ? "Time entries waiting for your approval"
                : "Your entries pending manager approval"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {isManager ? entry.user.name : formatDate(entry.clockIn)}
                      </span>
                      {getStatusBadge(entry.status, entry.clockOut)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(entry.clockIn)} • {formatTime(entry.clockIn)} -{" "}
                      {entry.clockOut ? formatTime(entry.clockOut) : "Active"}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">
                        {calculateTotalHours(entry).toFixed(2)} hours
                      </span>
                      {entry.totalBreak > 0 && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({entry.totalBreak} min break)
                        </span>
                      )}
                    </p>
                    {entry.shift && (
                      <p className="text-xs text-muted-foreground">
                        Shift: {entry.shift.title}
                      </p>
                    )}
                  </div>
                  {isManager && <TimesheetActions entry={entry} />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Approved Entries</CardTitle>
          <CardDescription>Completed and approved time entries</CardDescription>
        </CardHeader>
        <CardContent>
          {approvedEntries.length > 0 ? (
            <div className="space-y-4">
              {approvedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {isManager ? entry.user.name : formatDate(entry.clockIn)}
                      </span>
                      {getStatusBadge(entry.status, entry.clockOut)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(entry.clockIn)} • {formatTime(entry.clockIn)} -{" "}
                      {entry.clockOut ? formatTime(entry.clockOut) : "Active"}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">
                        {calculateTotalHours(entry).toFixed(2)} hours
                      </span>
                    </p>
                  </div>
                  {isManager && <TimesheetActions entry={entry} />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No approved entries yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
