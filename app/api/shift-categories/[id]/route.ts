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

    const category = await prisma.shiftCategory.findUnique({
      where: { id },
    });

    if (!category || category.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Get shift category error:", error);
    return NextResponse.json(
      { error: "Failed to get shift category" },
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

    const category = await prisma.shiftCategory.findUnique({
      where: { id },
    });

    if (!category || category.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const updatedCategory = await prisma.shiftCategory.update({
      where: { id },
      data: {
        name: data.name,
        hourlyRate: data.hourlyRate !== undefined ? parseFloat(data.hourlyRate) : undefined,
        color: data.color,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("Update shift category error:", error);
    return NextResponse.json(
      { error: "Failed to update shift category" },
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

    const category = await prisma.shiftCategory.findUnique({
      where: { id },
      include: { shifts: { take: 1 } },
    });

    if (!category || category.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // If category has shifts, soft delete by setting isActive to false
    if (category.shifts.length > 0) {
      await prisma.shiftCategory.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, softDeleted: true });
    }

    // Otherwise, hard delete
    await prisma.shiftCategory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete shift category error:", error);
    return NextResponse.json(
      { error: "Failed to delete shift category" },
      { status: 500 }
    );
  }
}
