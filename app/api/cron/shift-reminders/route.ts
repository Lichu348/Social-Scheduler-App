import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, shiftReminderEmail } from "@/lib/email";

// This route can be called by a cron job service (e.g., Vercel Cron, GitHub Actions)
// to send shift reminders to employees

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

    // Get all organizations with their reminder settings
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        shiftReminderHours: true,
      },
    });

    const now = new Date();
    let totalReminders = 0;
    let emailsSent = 0;

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
            select: { id: true, name: true, email: true },
          },
          location: {
            select: { name: true },
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
          const endDate = new Date(shift.endTime);

          const formattedDate = shiftDate.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          const formattedTime = `${shiftDate.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })} - ${endDate.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}`;

          // Create in-app notification
          await prisma.notification.create({
            data: {
              userId: shift.assignedTo.id,
              type: "SHIFT_REMINDER",
              title: "Upcoming Shift Reminder",
              message: `You have a shift "${shift.title}" on ${formattedDate} at ${shiftDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Shift ID: ${shift.id}`,
              link: "/dashboard/schedule",
            },
          });
          totalReminders++;

          // Send email notification
          if (shift.assignedTo.email) {
            const emailContent = shiftReminderEmail({
              employeeName: shift.assignedTo.name || "Team Member",
              shiftTitle: shift.title,
              shiftDate: formattedDate,
              shiftTime: formattedTime,
              locationName: shift.location?.name,
              organizationName: org.name,
            });

            const result = await sendEmail({
              to: shift.assignedTo.email,
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
            });

            if (result.success) {
              emailsSent++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      remindersCreated: totalReminders,
      emailsSent,
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
