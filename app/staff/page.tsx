import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { MobileStaffView } from "@/components/mobile-staff-view";

async function getStaffData(userId: string, organizationId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

  const [
    upcomingShifts,
    activeTimeEntry,
    monthTimeEntries,
    pendingSwapRequests,
    user,
  ] = await Promise.all([
    // Upcoming shifts for next 2 weeks
    prisma.shift.findMany({
      where: {
        assignedToId: userId,
        startTime: { gte: today, lt: twoWeeksFromNow },
      },
      include: {
        location: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { startTime: "asc" },
    }),
    // Active time entry (clocked in)
    prisma.timeEntry.findFirst({
      where: {
        userId,
        clockOut: null,
      },
      include: {
        shift: { select: { id: true, title: true } },
      },
    }),
    // This month's time entries for timesheet
    prisma.timeEntry.findMany({
      where: {
        userId,
        clockIn: { gte: monthStart, lte: monthEnd },
      },
      include: {
        shift: { select: { id: true, title: true } },
      },
      orderBy: { clockIn: "desc" },
    }),
    // Pending swap/drop requests
    prisma.swapRequest.findMany({
      where: {
        fromUserId: userId,
        status: "PENDING",
      },
      include: {
        shift: { select: { id: true, title: true, startTime: true, endTime: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // User info
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, staffRole: true },
    }),
  ]);

  // Calculate monthly hours
  let totalHoursWithBreaks = 0;
  let totalHoursWithoutBreaks = 0;
  let totalBreakMinutes = 0;

  monthTimeEntries.forEach((entry) => {
    if (entry.clockOut) {
      const clockIn = new Date(entry.clockIn).getTime();
      const clockOut = new Date(entry.clockOut).getTime();
      const hoursWithoutBreaks = (clockOut - clockIn) / (1000 * 60 * 60);
      const breakHours = entry.totalBreak / 60;

      totalHoursWithoutBreaks += hoursWithoutBreaks;
      totalHoursWithBreaks += hoursWithoutBreaks - breakHours;
      totalBreakMinutes += entry.totalBreak;
    }
  });

  return {
    upcomingShifts,
    activeTimeEntry,
    monthTimeEntries,
    pendingSwapRequests,
    user,
    monthlyStats: {
      totalHoursWithBreaks: Math.round(totalHoursWithBreaks * 100) / 100,
      totalHoursWithoutBreaks: Math.round(totalHoursWithoutBreaks * 100) / 100,
      totalBreakMinutes,
      entriesCount: monthTimeEntries.filter((e) => e.clockOut).length,
    },
  };
}

export default async function StaffMobilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getStaffData(session.user.id, session.user.organizationId);

  return (
    <MobileStaffView
      user={{
        id: session.user.id,
        name: data.user?.name || session.user.name || "",
        email: data.user?.email || session.user.email || "",
        staffRole: data.user?.staffRole || "",
      }}
      upcomingShifts={data.upcomingShifts}
      activeTimeEntry={data.activeTimeEntry}
      monthTimeEntries={data.monthTimeEntries}
      pendingSwapRequests={data.pendingSwapRequests}
      monthlyStats={data.monthlyStats}
    />
  );
}
