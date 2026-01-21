import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET weekly tasks
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get("weekStart");
    const locationId = searchParams.get("locationId");
    const date = searchParams.get("date");

    if (!weekStart) {
      return NextResponse.json(
        { error: "weekStart is required" },
        { status: 400 }
      );
    }

    const weekStartDate = new Date(weekStart);
    weekStartDate.setHours(0, 0, 0, 0);

    const where: {
      organizationId: string;
      weekStart: Date;
      locationId?: string | null;
      dueDate?: { gte: Date; lt: Date };
    } = {
      organizationId: session.user.organizationId,
      weekStart: weekStartDate,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    // Filter by specific date if provided
    if (date) {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      where.dueDate = { gte: dateStart, lt: dateEnd };
    }

    const tasks = await prisma.weeklyTask.findMany({
      where,
      include: {
        completedBy: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
        template: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST create ad-hoc task
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
    const { name, description, dueDate, category, priority, locationId } = body;

    if (!name || !dueDate) {
      return NextResponse.json(
        { error: "Name and due date are required" },
        { status: 400 }
      );
    }

    // Calculate week start (Monday)
    const dueDateObj = new Date(dueDate);
    const dayOfWeek = dueDateObj.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(dueDateObj);
    weekStart.setDate(dueDateObj.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const task = await prisma.weeklyTask.create({
      data: {
        name,
        description: description || null,
        weekStart,
        dueDate: new Date(dueDate),
        category: category || "GENERAL",
        priority: priority || 1,
        isAdhoc: true,
        locationId: locationId || null,
        organizationId: session.user.organizationId,
      },
      include: {
        completedBy: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
