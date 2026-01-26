import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";

const manualTimeEntrySchema = z.object({
  userId: z.string().cuid({ error: "Invalid user ID" }),
  shiftId: z.string().cuid({ error: "Invalid shift ID" }).optional().nullable(),
  clockIn: z.string().datetime({ error: "Invalid clock-in time" }),
  clockOut: z.string().datetime({ error: "Invalid clock-out time" }),
  totalBreak: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => new Date(data.clockIn) < new Date(data.clockOut),
  {
    message: "Clock out time must be after clock in time",
    path: ["clockOut"],
  }
);

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

    const body = await req.json();
    const parseResult = manualTimeEntrySchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { userId, clockIn, clockOut, totalBreak, notes, shiftId } = parseResult.data;

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
    await createNotification({
      userId,
      type: "MANUAL_TIME_ENTRY",
      title: "Time Entry Added",
      message: `A manager has added a time entry for you on ${clockInDate.toLocaleDateString()}`,
      link: "/dashboard/timesheet",
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
