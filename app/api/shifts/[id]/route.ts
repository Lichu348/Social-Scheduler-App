import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true, hourlyRate: true, color: true },
        },
      },
    });

    if (!shift || shift.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    return NextResponse.json(shift);
  } catch (error) {
    console.error("Get shift error:", error);
    return NextResponse.json(
      { error: "Failed to get shift" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const data = await req.json();

    const shift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!shift || shift.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        assignedToId: data.assignedToId !== undefined ? data.assignedToId : undefined,
        isOpen: data.assignedToId === null || data.assignedToId === "",
        status: data.status,
        categoryId: data.categoryId !== undefined ? data.categoryId : undefined,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true, hourlyRate: true, color: true },
        },
      },
    });

    return NextResponse.json(updatedShift);
  } catch (error) {
    console.error("Update shift error:", error);
    return NextResponse.json(
      { error: "Failed to update shift" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const shift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!shift || shift.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    await prisma.shift.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete shift error:", error);
    return NextResponse.json(
      { error: "Failed to delete shift" },
      { status: 500 }
    );
  }
}
