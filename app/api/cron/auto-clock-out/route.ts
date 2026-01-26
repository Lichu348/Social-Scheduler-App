import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

// This route should be called by a cron job at midnight
// It flags time entries where staff forgot to clock out
// Clock-out is left blank so managers can see and fill it in manually

export async function GET(req: Request) {
  try {
    // Require CRON_SECRET for authorization
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Get midnight of today (start of current day)
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);

    // Find all time entries that:
    // 1. Have no clock out time
    // 2. Clock in was before midnight today (so they've been clocked in overnight)
    // 3. Haven't already been flagged as missed
    const missedClockOuts = await prisma.timeEntry.findMany({
      where: {
        clockOut: null,
        clockIn: {
          lt: todayMidnight, // Clocked in before today's midnight
        },
        missedClockOut: false, // Not already flagged
      },
      include: {
        user: {
          select: { id: true, name: true, organizationId: true },
        },
        shift: {
          select: { id: true, title: true },
        },
      },
    });

    let flaggedCount = 0;
    const notifications: { userId: string; message: string }[] = [];

    for (const entry of missedClockOuts) {
      // Flag the time entry as missed clock out
      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: { missedClockOut: true },
      });
      flaggedCount++;

      // Create a notification for managers in this organization
      const managers = await prisma.user.findMany({
        where: {
          organizationId: entry.user.organizationId,
          role: { in: ["ADMIN", "MANAGER"] },
        },
        select: { id: true },
      });

      const clockInDate = new Date(entry.clockIn).toLocaleDateString("en-GB", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const clockInTime = new Date(entry.clockIn).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });

      for (const manager of managers) {
        await createNotification({
          userId: manager.id,
          type: "MISSED_CLOCK_OUT",
          title: "Missed Clock Out",
          message: `${entry.user.name} forgot to clock out. Clocked in ${clockInDate} at ${clockInTime}.`,
          link: "/dashboard/timesheet",
        });
      }

      notifications.push({
        userId: entry.user.id,
        message: `Flagged missed clock out for ${entry.user.name}`,
      });
    }

    return NextResponse.json({
      success: true,
      flaggedCount,
      notifications,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Auto clock-out cron error:", error);
    return NextResponse.json(
      { error: "Failed to process auto clock-out" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(req: Request) {
  return GET(req);
}
