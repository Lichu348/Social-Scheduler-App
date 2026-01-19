import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Fetch user's assigned locations
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can view location assignments
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: userId } = await params;

    const userLocations = await prisma.locationStaff.findMany({
      where: { userId },
      select: {
        locationId: true,
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(userLocations.map((ul) => ul.location));
  } catch (error) {
    console.error("Get user locations error:", error);
    return NextResponse.json(
      { error: "Failed to get user locations" },
      { status: 500 }
    );
  }
}

// PUT - Update user's assigned locations (replace all)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can modify location assignments
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: userId } = await params;
    const { locationIds } = await req.json();

    if (!Array.isArray(locationIds)) {
      return NextResponse.json(
        { error: "locationIds must be an array" },
        { status: 400 }
      );
    }

    // Verify user belongs to same organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify all locations belong to the organization
    const validLocations = await prisma.location.findMany({
      where: {
        id: { in: locationIds },
        organizationId: session.user.organizationId,
      },
      select: { id: true },
    });

    const validLocationIds = validLocations.map((l) => l.id);

    // Delete existing assignments
    await prisma.locationStaff.deleteMany({
      where: { userId },
    });

    // Create new assignments
    if (validLocationIds.length > 0) {
      await prisma.locationStaff.createMany({
        data: validLocationIds.map((locationId) => ({
          userId,
          locationId,
        })),
      });
    }

    // Return updated locations
    const updatedLocations = await prisma.locationStaff.findMany({
      where: { userId },
      select: {
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updatedLocations.map((ul) => ul.location));
  } catch (error) {
    console.error("Update user locations error:", error);
    return NextResponse.json(
      { error: "Failed to update user locations" },
      { status: 500 }
    );
  }
}
