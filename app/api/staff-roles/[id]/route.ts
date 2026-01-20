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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { name, description, color, isActive } = await req.json();

    const staffRole = await prisma.staffRole.findUnique({
      where: { id },
    });

    if (!staffRole || staffRole.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Staff role not found" }, { status: 404 });
    }

    const updatedRole = await prisma.staffRole.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        color: color !== undefined ? color : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("Update staff role error:", error);
    return NextResponse.json(
      { error: "Failed to update staff role" },
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const staffRole = await prisma.staffRole.findUnique({
      where: { id },
    });

    if (!staffRole || staffRole.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Staff role not found" }, { status: 404 });
    }

    // Check if any users have this role
    const usersWithRole = await prisma.user.count({
      where: {
        organizationId: session.user.organizationId,
        staffRole: staffRole.code,
      },
    });

    if (usersWithRole > 0) {
      return NextResponse.json(
        { error: `Cannot delete role - ${usersWithRole} staff members have this role` },
        { status: 400 }
      );
    }

    await prisma.staffRole.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete staff role error:", error);
    return NextResponse.json(
      { error: "Failed to delete staff role" },
      { status: 500 }
    );
  }
}
