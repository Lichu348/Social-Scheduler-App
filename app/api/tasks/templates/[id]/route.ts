import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH update task template
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
    const body = await req.json();

    // Verify template exists and belongs to org
    const existing = await prisma.taskTemplate.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { name, description, dayOfWeek, category, priority, locationId, sortOrder, isActive } = body;

    const template = await prisma.taskTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(dayOfWeek !== undefined && { dayOfWeek }),
        ...(category !== undefined && { category }),
        ...(priority !== undefined && { priority }),
        ...(locationId !== undefined && { locationId }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE task template (soft delete by setting isActive to false)
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

    // Verify template exists and belongs to org
    const existing = await prisma.taskTemplate.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Soft delete
    await prisma.taskTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
