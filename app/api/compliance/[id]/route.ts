import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET single compliance item
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
    const isAdmin = session.user.role === "ADMIN";
    const isManager = session.user.role === "MANAGER";

    // For managers, get their assigned location IDs
    let managerLocationIds: string[] = [];
    if (isManager) {
      const managerLocations = await prisma.locationStaff.findMany({
        where: { userId: session.user.id },
        select: { locationId: true },
      });
      managerLocationIds = managerLocations.map((l) => l.locationId);
    }

    const item = await prisma.complianceItem.findUnique({
      where: { id },
      include: {
        userRecords: {
          where: isAdmin
            ? {} // Admins see all records
            : isManager
            ? {
                // Managers see records for users at their locations
                user: {
                  locationAccess: {
                    some: {
                      locationId: { in: managerLocationIds },
                    },
                  },
                },
              }
            : {
                // Employees see only their own record
                userId: session.user.id,
              },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                staffRole: true,
              },
            },
          },
        },
      },
    });

    if (!item || item.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Get compliance item error:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance item" },
      { status: 500 }
    );
  }
}

// PATCH update compliance item
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
    const body = await req.json();

    // Verify item exists and belongs to org
    const existing = await prisma.complianceItem.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const {
      name,
      description,
      validityMonths,
      isRequired,
      requiredForRoles,
      fileUrl,
      fileName,
      requiresProof,
      isActive,
    } = body;

    const item = await prisma.complianceItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(validityMonths !== undefined && { validityMonths }),
        ...(isRequired !== undefined && { isRequired }),
        ...(requiredForRoles !== undefined && {
          requiredForRoles: JSON.stringify(requiredForRoles),
        }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(fileName !== undefined && { fileName }),
        ...(requiresProof !== undefined && { requiresProof }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Update compliance item error:", error);
    return NextResponse.json(
      { error: "Failed to update compliance item" },
      { status: 500 }
    );
  }
}

// DELETE compliance item
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

    // Verify item exists and belongs to org
    const existing = await prisma.complianceItem.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete all user records first
    await prisma.userCompliance.deleteMany({
      where: { complianceItemId: id },
    });

    // Delete the item
    await prisma.complianceItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete compliance item error:", error);
    return NextResponse.json(
      { error: "Failed to delete compliance item" },
      { status: 500 }
    );
  }
}
