import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// This route can be called by a cron job service (e.g., Vercel Cron, GitHub Actions)
// to send shift reminders to employees

export async function GET(req: Request) {
  try {
    // Optional: Add authorization for cron jobs
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all organizations with their reminder settings
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        shiftReminderHours: true,
      },
    });

    const now = new Date();
    let totalReminders = 0;

    for (const org of organizations) {
      const reminderHours = org.shiftReminderHours;

      // Calculate the time window for shifts that need reminders
      // Shifts starting between now + (reminderHours - 0.5) and now + (reminderHours + 0.5) hours
      const windowStart = new Date(now.getTime() + (reminderHours - 0.5) * 60 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + (reminderHours + 0.5) * 60 * 60 * 1000);

      // Find shifts starting within the reminder window
      const upcomingShifts = await prisma.shift.findMany({
        where: {
          organizationId: org.id,
          status: "SCHEDULED",
          assignedToId: { not: null },
          startTime: {
            gte: windowStart,
            lt: windowEnd,
          },
        },
        include: {
          assignedTo: {
            select: { id: true, name: true },
          },
        },
      });

      // Create reminder notifications for each shift
      for (const shift of upcomingShifts) {
        if (!shift.assignedTo) continue;

        // Check if a reminder was already sent for this shift
        const existingReminder = await prisma.notification.findFirst({
          where: {
            userId: shift.assignedTo.id,
            type: "SHIFT_REMINDER",
            link: `/dashboard/schedule`,
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Within last 24 hours
            },
            message: {
              contains: shift.id,
            },
          },
        });

        if (!existingReminder) {
          const shiftDate = new Date(shift.startTime);
          const formattedDate = shiftDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          const formattedTime = shiftDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });

          await prisma.notification.create({
            data: {
              userId: shift.assignedTo.id,
              type: "SHIFT_REMINDER",
              title: "Upcoming Shift Reminder",
              message: `You have a shift "${shift.title}" on ${formattedDate} at ${formattedTime}. Shift ID: ${shift.id}`,
              link: "/dashboard/schedule",
            },
          });
          totalReminders++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      remindersCreated: totalReminders,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Shift reminder cron error:", error);
    return NextResponse.json(
      { error: "Failed to process shift reminders" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(req: Request) {
  return GET(req);
}
