import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST generate weekly tasks from templates
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
    const { weekStart, locationId } = body;

    if (!weekStart) {
      return NextResponse.json(
        { error: "weekStart is required" },
        { status: 400 }
      );
    }

    const weekStartDate = new Date(weekStart);
    weekStartDate.setHours(0, 0, 0, 0);

    // Check if tasks already generated for this week
    const existingTasks = await prisma.weeklyTask.findFirst({
      where: {
        organizationId: session.user.organizationId,
        weekStart: weekStartDate,
        isAdhoc: false,
        ...(locationId && { locationId }),
      },
    });

    if (existingTasks) {
      return NextResponse.json(
        { error: "Tasks already generated for this week" },
        { status: 400 }
      );
    }

    // Get active templates
    const templates = await prisma.taskTemplate.findMany({
      where: {
        organizationId: session.user.organizationId,
        isActive: true,
        ...(locationId && { OR: [{ locationId }, { locationId: null }] }),
      },
    });

    // Generate tasks for each template
    const tasksToCreate = [];

    for (const template of templates) {
      if (template.dayOfWeek !== null) {
        // Specific day task
        const dueDate = new Date(weekStartDate);
        // dayOfWeek: 0 = Monday, 6 = Sunday
        dueDate.setDate(weekStartDate.getDate() + template.dayOfWeek);

        tasksToCreate.push({
          name: template.name,
          description: template.description,
          weekStart: weekStartDate,
          dueDate,
          category: template.category,
          priority: template.priority,
          sortOrder: template.sortOrder,
          isAdhoc: false,
          templateId: template.id,
          locationId: template.locationId,
          organizationId: session.user.organizationId,
        });
      } else {
        // Daily task - create for each day of the week
        for (let day = 0; day < 7; day++) {
          const dueDate = new Date(weekStartDate);
          dueDate.setDate(weekStartDate.getDate() + day);

          tasksToCreate.push({
            name: template.name,
            description: template.description,
            weekStart: weekStartDate,
            dueDate,
            category: template.category,
            priority: template.priority,
            sortOrder: template.sortOrder,
            isAdhoc: false,
            templateId: template.id,
            locationId: template.locationId,
            organizationId: session.user.organizationId,
          });
        }
      }
    }

    // Bulk create tasks
    const result = await prisma.weeklyTask.createMany({
      data: tasksToCreate,
    });

    return NextResponse.json({
      success: true,
      tasksCreated: result.count,
    });
  } catch (error) {
    console.error("Generate tasks error:", error);
    return NextResponse.json(
      { error: "Failed to generate tasks" },
      { status: 500 }
    );
  }
}
