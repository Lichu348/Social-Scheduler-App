import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH update/complete task
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify task exists and belongs to org
    const existing = await prisma.weeklyTask.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { isCompleted, completionNotes, name, description, dueDate, category, priority } = body;

    const updateData: {
      isCompleted?: boolean;
      completedAt?: Date | null;
      completedById?: string | null;
      completionNotes?: string | null;
      name?: string;
      description?: string | null;
      dueDate?: Date;
      category?: string;
      priority?: number;
    } = {};

    // Handle completion
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      if (isCompleted) {
        updateData.completedAt = new Date();
        updateData.completedById = session.user.id;
        if (completionNotes !== undefined) {
          updateData.completionNotes = completionNotes;
        }
      } else {
        updateData.completedAt = null;
        updateData.completedById = null;
        updateData.completionNotes = null;
      }
    }

    // Handle other updates (manager only)
    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
    if (isManager) {
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
      if (category !== undefined) updateData.category = category;
      if (priority !== undefined) updateData.priority = priority;
    }

    const task = await prisma.weeklyTask.update({
      where: { id },
      data: updateData,
      include: {
        completedBy: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE task (ad-hoc only, manager only)
export async function DELETE(
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

    // Verify task exists and belongs to org
    const existing = await prisma.weeklyTask.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only allow deleting ad-hoc tasks
    if (!existing.isAdhoc) {
      return NextResponse.json(
        { error: "Cannot delete recurring tasks. Disable the template instead." },
        { status: 400 }
      );
    }

    await prisma.weeklyTask.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
