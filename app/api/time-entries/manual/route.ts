import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST: Create a manual time entry (Managers/Admins only)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, clockIn, clockOut, totalBreak, notes, shiftId } = await req.json();

    if (!userId || !clockIn || !clockOut) {
      return NextResponse.json(
        { error: "User, clock in time, and clock out time are required" },
        { status: 400 }
      );
    }

    // Verify the user belongs to the same organization
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, organizationId: true },
    });

    if (!targetUser || targetUser.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const clockInDate = new Date(clockIn);
    const clockOutDate = new Date(clockOut);

    // Validate clock out is after clock in
    if (clockOutDate <= clockInDate) {
      return NextResponse.json(
        { error: "Clock out time must be after clock in time" },
        { status: 400 }
      );
    }

    // Create the manual time entry - mark as APPROVED since it's manually entered by manager
    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        clockIn: clockInDate,
        clockOut: clockOutDate,
        totalBreak: totalBreak || 0,
        notes: notes ? `[Manual Entry] ${notes}` : "[Manual Entry]",
        status: "APPROVED",
        shiftId: shiftId || null,
        clockInApproved: true,
        clockInApprovedBy: session.user.id,
        clockInApprovedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        shift: {
          select: { id: true, title: true },
        },
      },
    });

    // Notify the employee about the manual entry
    await prisma.notification.create({
      data: {
        userId,
        type: "MANUAL_TIME_ENTRY",
        title: "Time Entry Added",
        message: `A manager has added a time entry for you on ${clockInDate.toLocaleDateString()}`,
        link: "/dashboard/timesheet",
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Create manual time entry error:", error);
    return NextResponse.json(
      { error: "Failed to create time entry" },
      { status: 500 }
    );
  }
}
