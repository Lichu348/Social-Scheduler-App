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
    const { name, description, validityMonths, isRequired, requiredForRoles } = await req.json();

    const certType = await prisma.certificationType.findUnique({
      where: { id },
    });

    if (!certType || certType.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Certification type not found" }, { status: 404 });
    }

    const updated = await prisma.certificationType.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        validityMonths: validityMonths !== undefined ? validityMonths : undefined,
        isRequired: isRequired !== undefined ? isRequired : undefined,
        requiredForRoles: requiredForRoles !== undefined ? JSON.stringify(requiredForRoles) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update certification type error:", error);
    return NextResponse.json(
      { error: "Failed to update certification type" },
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

    const certType = await prisma.certificationType.findUnique({
      where: { id },
    });

    if (!certType || certType.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Certification type not found" }, { status: 404 });
    }

    await prisma.certificationType.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete certification type error:", error);
    return NextResponse.json(
      { error: "Failed to delete certification type" },
      { status: 500 }
    );
  }
}
