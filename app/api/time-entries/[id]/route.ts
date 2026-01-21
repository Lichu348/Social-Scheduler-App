import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { status, clockIn, clockOut, notes, approveClockIn, rejectClockIn } = await req.json();

    const entry = await prisma.timeEntry.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!entry || entry.user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Build update data
    const updateData: {
      status?: string;
      clockIn?: Date;
      clockOut?: Date | null;
      notes?: string | null;
      clockInApproved?: boolean;
      clockInApprovedBy?: string;
      clockInApprovedAt?: Date;
    } = {};

    if (status !== undefined) {
      updateData.status = status;
    }
    if (clockIn !== undefined) {
      updateData.clockIn = new Date(clockIn);
    }
    if (clockOut !== undefined) {
      updateData.clockOut = clockOut ? new Date(clockOut) : null;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Handle clock-in approval
    if (approveClockIn) {
      updateData.clockInApproved = true;
      updateData.clockInApprovedBy = session.user.id;
      updateData.clockInApprovedAt = new Date();
    }

    // Handle clock-in rejection (delete the entry)
    if (rejectClockIn) {
      await prisma.timeEntry.delete({ where: { id } });

      // Notify the user
      await prisma.notification.create({
        data: {
          userId: entry.userId,
          type: "CLOCKIN_REJECTED",
          title: "Clock-in Rejected",
          message: `Your ${entry.clockInFlag?.toLowerCase()} clock-in was rejected by a manager`,
          link: "/dashboard/timesheet",
        },
      });

      return NextResponse.json({ success: true, deleted: true });
    }

    const updatedEntry = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        shift: {
          select: { id: true, title: true, startTime: true, endTime: true },
        },
      },
    });

    // Notify the user only for status changes
    if (status) {
      await prisma.notification.create({
        data: {
          userId: entry.userId,
          type: status === "APPROVED" ? "TIMESHEET_APPROVED" : "TIMESHEET_REJECTED",
          title: status === "APPROVED" ? "Timesheet Approved" : "Timesheet Rejected",
          message: `Your time entry has been ${status.toLowerCase()}`,
          link: "/dashboard/timesheet",
        },
      });
    }

    // Notify user if their early/late clock-in was approved
    if (approveClockIn && entry.clockInFlag) {
      await prisma.notification.create({
        data: {
          userId: entry.userId,
          type: "CLOCKIN_APPROVED",
          title: "Clock-in Approved",
          message: `Your ${entry.clockInFlag.toLowerCase()} clock-in has been approved`,
          link: "/dashboard/timesheet",
        },
      });
    }

    // Notify user if their time entry was edited by a manager
    if ((clockIn !== undefined || clockOut !== undefined) && entry.userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: entry.userId,
          type: "TIMESHEET_EDITED",
          title: "Time Entry Updated",
          message: "A manager has updated your time entry",
          link: "/dashboard/timesheet",
        },
      });
    }

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error("Update time entry error:", error);
    return NextResponse.json(
      { error: "Failed to update time entry" },
      { status: 500 }
    );
  }
}
