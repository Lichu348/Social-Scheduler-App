import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shiftId } = await req.json();

    // Check if already clocked in
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        clockOut: null,
      },
    });

    if (activeEntry) {
      return NextResponse.json(
        { error: "Already clocked in" },
        { status: 400 }
      );
    }

    // Get organization settings
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { clockInWindowMinutes: true },
    });

    const clockInWindowMinutes = organization?.clockInWindowMinutes ?? 15;
    const now = new Date();

    // If a shift is provided, validate clock-in window
    if (shiftId) {
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
      });

      if (!shift) {
        return NextResponse.json(
          { error: "Shift not found" },
          { status: 404 }
        );
      }

      // Check if shift belongs to user
      if (shift.assignedToId !== session.user.id) {
        return NextResponse.json(
          { error: "This shift is not assigned to you" },
          { status: 403 }
        );
      }

      // Calculate allowed clock-in window
      const earliestClockIn = new Date(shift.startTime.getTime() - clockInWindowMinutes * 60 * 1000);
      const latestClockIn = shift.endTime;

      if (now < earliestClockIn) {
        const minutesUntil = Math.ceil((earliestClockIn.getTime() - now.getTime()) / (60 * 1000));
        return NextResponse.json(
          {
            error: `You can only clock in within ${clockInWindowMinutes} minutes of your shift start time. Please wait ${minutesUntil} more minutes.`,
            code: "TOO_EARLY"
          },
          { status: 400 }
        );
      }

      if (now > latestClockIn) {
        return NextResponse.json(
          {
            error: "This shift has already ended. Please contact your manager.",
            code: "SHIFT_ENDED"
          },
          { status: 400 }
        );
      }
    } else {
      // No shift provided - check if user has a scheduled shift they should be clocking into
      const upcomingShift = await prisma.shift.findFirst({
        where: {
          assignedToId: session.user.id,
          status: "SCHEDULED",
          startTime: {
            gte: new Date(now.getTime() - clockInWindowMinutes * 60 * 1000),
            lte: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Within next 24 hours
          },
        },
        orderBy: { startTime: "asc" },
      });

      // If there's an upcoming shift within the window, auto-associate
      if (upcomingShift) {
        const earliestClockIn = new Date(upcomingShift.startTime.getTime() - clockInWindowMinutes * 60 * 1000);

        if (now >= earliestClockIn && now <= upcomingShift.endTime) {
          // Auto-associate with the shift
          const timeEntry = await prisma.timeEntry.create({
            data: {
              userId: session.user.id,
              shiftId: upcomingShift.id,
              clockIn: now,
            },
          });
          return NextResponse.json(timeEntry);
        }
      }
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: session.user.id,
        shiftId: shiftId || null,
        clockIn: now,
      },
    });

    return NextResponse.json(timeEntry);
  } catch (error) {
    console.error("Clock in error:", error);
    return NextResponse.json(
      { error: "Failed to clock in" },
      { status: 500 }
    );
  }
}
