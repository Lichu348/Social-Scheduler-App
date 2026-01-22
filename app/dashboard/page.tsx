import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/utils";
import { Calendar, Clock, ArrowLeftRight, Palmtree, Users, FileText, CheckCircle, AlertCircle, DollarSign, Hand } from "lucide-react";
import Link from "next/link";
import { ClockInButton } from "@/components/clock-in-button";

async function getDashboardData(userId: string, organizationId: string, role: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Get current pay period dates (default to current week if no pay period found)
  const currentPayPeriod = await prisma.payPeriod.findFirst({
    where: {
      organizationId,
      startDate: { lte: today },
      endDate: { gte: today },
    },
  });

  const periodStart = currentPayPeriod?.startDate || getWeekStart(today);
  const periodEnd = currentPayPeriod?.endDate || getWeekEnd(today);

  const [
    todayShift,
    upcomingShifts,
    pendingSwaps,
    pendingHolidays,
    activeTimeEntry,
    teamMembers,
    starterForm,
    periodShifts,
    userCategoryRates,
    openShiftsCount,
  ] = await Promise.all([
    // Today's shift for the user
    prisma.shift.findFirst({
      where: {
        assignedToId: userId,
        startTime: { gte: today },
        endTime: { lt: tomorrow },
      },
      orderBy: { startTime: "asc" },
    }),
    // Upcoming shifts this week
    prisma.shift.findMany({
      where: {
        assignedToId: userId,
        startTime: { gte: tomorrow, lt: weekEnd },
      },
      orderBy: { startTime: "asc" },
      take: 5,
    }),
    // Pending swap requests (for managers: all org, for employees: their own)
    prisma.swapRequest.count({
      where: role === "EMPLOYEE"
        ? { fromUserId: userId, status: "PENDING" }
        : { shift: { organizationId }, status: "PENDING" },
    }),
    // Pending holiday requests
    prisma.holidayRequest.count({
      where: role === "EMPLOYEE"
        ? { userId, status: "PENDING" }
        : { user: { organizationId }, status: "PENDING" },
    }),
    // Active time entry (clocked in)
    prisma.timeEntry.findFirst({
      where: {
        userId,
        clockOut: null,
      },
    }),
    // Team member count
    prisma.user.count({
      where: { organizationId },
    }),
    // Starter form status
    prisma.starterForm.findUnique({
      where: { userId },
      select: { status: true },
    }),
    // Shifts for current pay period (for earnings calculation)
    prisma.shift.findMany({
      where: {
        assignedToId: userId,
        startTime: { gte: periodStart },
        endTime: { lte: new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000) },
      },
      include: {
        category: { select: { id: true, hourlyRate: true } },
      },
    }),
    // User-specific hourly rates
    prisma.userCategoryRate.findMany({
      where: { userId },
      select: { categoryId: true, hourlyRate: true },
    }),
    // Open shifts count
    prisma.shift.count({
      where: {
        organizationId,
        isOpen: true,
        startTime: { gte: today },
      },
    }),
  ]);

  // Calculate earnings estimate
  let estimatedEarnings = 0;
  let totalHours = 0;

  periodShifts.forEach((shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const paidHours = hours - (shift.scheduledBreakMinutes || 0) / 60;
    totalHours += paidHours;

    if (shift.category) {
      // Check for user-specific rate first
      const userRate = userCategoryRates.find((r) => r.categoryId === shift.category?.id);
      const hourlyRate = userRate?.hourlyRate || shift.category.hourlyRate;
      estimatedEarnings += paidHours * hourlyRate;
    }
  });

  return {
    todayShift,
    upcomingShifts,
    pendingSwaps,
    pendingHolidays,
    activeTimeEntry,
    teamMembers,
    starterForm,
    estimatedEarnings,
    totalHours,
    periodName: currentPayPeriod?.name || "This Week",
    openShiftsCount,
  };
}

// Helper functions for week dates
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date: Date): Date {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const data = await getDashboardData(
    session.user.id,
    session.user.organizationId,
    session.user.role
  );

  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back, {session.user.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your schedule today
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Shift</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.todayShift ? (
              <>
                <div className="text-2xl font-bold">
                  {formatTime(data.todayShift.startTime)}
                </div>
                <p className="text-xs text-muted-foreground">
                  to {formatTime(data.todayShift.endTime)}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">No shift</div>
                <p className="text-xs text-muted-foreground">You&apos;re off today</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Time Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.activeTimeEntry ? (
              <>
                <div className="text-2xl font-bold text-green-600">Clocked In</div>
                <p className="text-xs text-muted-foreground">
                  Since {formatTime(data.activeTimeEntry.clockIn)}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">Not Clocked In</div>
                <p className="text-xs text-muted-foreground">
                  {data.todayShift ? "Ready to start?" : "No shift scheduled"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingSwaps}</div>
            <p className="text-xs text-muted-foreground">
              {isManager ? "Swap requests to review" : "Your swap requests"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {isManager ? "Holiday Requests" : "Estimated Earnings"}
            </CardTitle>
            {isManager ? (
              <Palmtree className="h-4 w-4 text-muted-foreground" />
            ) : (
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {isManager ? (
              <>
                <div className="text-2xl font-bold">{data.pendingHolidays}</div>
                <p className="text-xs text-muted-foreground">Pending approval</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  ${data.estimatedEarnings.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.totalHours.toFixed(1)}h scheduled ({data.periodName})
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Open Shifts Alert */}
      {data.openShiftsCount > 0 && (
        <Card className="mb-8 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-2 rounded-full bg-green-500/10">
              <Hand className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Open Shifts Available</CardTitle>
              <CardDescription>
                There {data.openShiftsCount === 1 ? "is" : "are"} {data.openShiftsCount} open shift{data.openShiftsCount === 1 ? "" : "s"} available to claim
              </CardDescription>
            </div>
            <Link href="/dashboard/open-shifts">
              <Button variant="outline" className="border-green-500 text-green-700 hover:bg-green-500/10">
                <Hand className="h-4 w-4 mr-2" />
                View Open Shifts
              </Button>
            </Link>
          </CardHeader>
        </Card>
      )}

      {/* Starter Form Prompt - show if not submitted/reviewed */}
      {(!data.starterForm || data.starterForm.status === "INCOMPLETE") && (
        <Card className="mb-8 border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-2 rounded-full bg-amber-500/10">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Complete Your Starter Form</CardTitle>
              <CardDescription>
                Please complete your new starter form with payroll and onboarding information
              </CardDescription>
            </div>
            <Link href="/dashboard/starter-form">
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                {data.starterForm?.status === "INCOMPLETE" ? "Continue Form" : "Start Form"}
              </Button>
            </Link>
          </CardHeader>
        </Card>
      )}

      {/* Starter Form Submitted Status */}
      {data.starterForm?.status === "SUBMITTED" && (
        <Card className="mb-8 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-2 rounded-full bg-blue-500/10">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Starter Form Submitted</CardTitle>
              <CardDescription>
                Your form has been submitted and is waiting for manager review
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-blue-500 text-blue-700">
              Pending Review
            </Badge>
          </CardHeader>
        </Card>
      )}

      {/* Starter Form Reviewed Status */}
      {data.starterForm?.status === "REVIEWED" && (
        <Card className="mb-8 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-2 rounded-full bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Starter Form Complete</CardTitle>
              <CardDescription>
                Your new starter form has been reviewed by your manager
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-green-500 text-green-700">
              Reviewed
            </Badge>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Clock In/Out Card */}
        <Card>
          <CardHeader>
            <CardTitle>Time Tracking</CardTitle>
            <CardDescription>
              {data.activeTimeEntry
                ? "You're currently clocked in"
                : "Clock in to start tracking your time"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClockInButton
              activeTimeEntry={data.activeTimeEntry}
              todayShift={data.todayShift}
            />
          </CardContent>
        </Card>

        {/* Upcoming Shifts */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Shifts</CardTitle>
            <CardDescription>Your schedule for the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcomingShifts.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{formatDate(shift.startTime)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </p>
                    </div>
                    <Badge variant="secondary">{shift.title}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No upcoming shifts scheduled
              </p>
            )}
            <Link
              href="/dashboard/schedule"
              className="block text-center text-sm text-primary hover:underline mt-4"
            >
              View full schedule
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
