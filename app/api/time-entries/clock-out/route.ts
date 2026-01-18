import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { timeEntryId } = await req.json();

    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: timeEntryId,
        userId: session.user.id,
        clockOut: null,
      },
    });

    if (!timeEntry) {
      return NextResponse.json(
        { error: "No active time entry found" },
        { status: 400 }
      );
    }

    // Can't clock out while on break
    if (timeEntry.breakStart) {
      return NextResponse.json(
        { error: "End your break before clocking out" },
        { status: 400 }
      );
    }

    const now = new Date();
    let warning: string | null = null;

    // Check if clocking out late (after grace period)
    if (timeEntry.shiftId) {
      const shift = await prisma.shift.findUnique({
        where: { id: timeEntry.shiftId },
        include: {
          organization: {
            select: { clockOutGraceMinutes: true },
          },
        },
      });

      if (shift) {
        const clockOutGraceMinutes = shift.organization.clockOutGraceMinutes;
        const latestClockOut = new Date(shift.endTime.getTime() + clockOutGraceMinutes * 60 * 1000);

        if (now > latestClockOut) {
          warning = `You are clocking out more than ${clockOutGraceMinutes} minutes after your shift ended. This may be flagged for manager review.`;
        }
      }
    }

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        clockOut: now,
      },
    });

    return NextResponse.json({ ...updatedEntry, warning });
  } catch (error) {
    console.error("Clock out error:", error);
    return NextResponse.json(
      { error: "Failed to clock out" },
      { status: 500 }
    );
  }
}
