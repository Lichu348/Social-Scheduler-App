import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Get availability (own by default, all if ?all=true and manager/admin)
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const viewAll = searchParams.get("all") === "true";

    // Employees can only view their own availability
    if (session.user.role === "EMPLOYEE" && userId && userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If explicitly requesting all availability (managers/admins only)
    if (viewAll && session.user.role !== "EMPLOYEE") {
      const allAvailability = await prisma.staffAvailability.findMany({
        where: {
          user: { organizationId: session.user.organizationId },
        },
        include: {
          user: {
            select: { id: true, name: true, staffRole: true },
          },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });

      return NextResponse.json(allAvailability);
    }

    // View specific user's availability (defaults to current user)
    const targetUserId = userId || session.user.id;
    const availability = await prisma.staffAvailability.findMany({
      where: { userId: targetUserId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Get availability error:", error);
    return NextResponse.json(
      { error: "Failed to get availability" },
      { status: 500 }
    );
  }
}

// Add availability slot
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dayOfWeek, startTime, endTime, isRecurring, specificDate, notes } = await req.json();

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Day of week, start time, and end time are required" },
        { status: 400 }
      );
    }

    // Validate day of week
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: "Day of week must be between 0 (Sunday) and 6 (Saturday)" },
        { status: 400 }
      );
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: "Times must be in HH:mm format" },
        { status: 400 }
      );
    }

    const availability = await prisma.staffAvailability.create({
      data: {
        userId: session.user.id,
        dayOfWeek,
        startTime,
        endTime,
        isRecurring: isRecurring ?? true,
        specificDate: specificDate ? new Date(specificDate) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Create availability error:", error);
    return NextResponse.json(
      { error: "Failed to create availability" },
      { status: 500 }
    );
  }
}

// Update availability slot
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, dayOfWeek, startTime, endTime, isRecurring, specificDate, notes } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Availability ID is required" }, { status: 400 });
    }

    const existing = await prisma.staffAvailability.findUnique({
      where: { id },
    });

    // Can only update own availability (unless admin)
    if (!existing || (existing.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Availability not found" }, { status: 404 });
    }

    const updated = await prisma.staffAvailability.update({
      where: { id },
      data: {
        dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : undefined,
        startTime: startTime !== undefined ? startTime : undefined,
        endTime: endTime !== undefined ? endTime : undefined,
        isRecurring: isRecurring !== undefined ? isRecurring : undefined,
        specificDate: specificDate !== undefined ? (specificDate ? new Date(specificDate) : null) : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update availability error:", error);
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 }
    );
  }
}

// Delete availability slot
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Availability ID is required" }, { status: 400 });
    }

    const existing = await prisma.staffAvailability.findUnique({
      where: { id },
    });

    // Can only delete own availability (unless admin)
    if (!existing || (existing.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Availability not found" }, { status: 404 });
    }

    await prisma.staffAvailability.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete availability error:", error);
    return NextResponse.json(
      { error: "Failed to delete availability" },
      { status: 500 }
    );
  }
}
