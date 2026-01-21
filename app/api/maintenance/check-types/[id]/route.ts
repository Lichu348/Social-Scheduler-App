import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  staffRole: string;
  organizationId: string;
  organizationName: string;
}

// PATCH update check type
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify check type exists and belongs to org
    const existing = await prisma.maintenanceCheckType.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { name, description, frequencyDays, isActive, sortOrder } = body;

    const checkType = await prisma.maintenanceCheckType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(frequencyDays !== undefined && { frequencyDays }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(checkType);
  } catch (error) {
    console.error("Update check type error:", error);
    return NextResponse.json(
      { error: "Failed to update check type" },
      { status: 500 }
    );
  }
}

// DELETE check type
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify check type exists and belongs to org
    const existing = await prisma.maintenanceCheckType.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete all logs first
    await prisma.maintenanceLog.deleteMany({
      where: { checkTypeId: id },
    });

    // Delete the check type
    await prisma.maintenanceCheckType.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete check type error:", error);
    return NextResponse.json(
      { error: "Failed to delete check type" },
      { status: 500 }
    );
  }
}
