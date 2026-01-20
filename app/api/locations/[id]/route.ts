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

    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        staff: {
          include: {
            user: {
              select: { id: true, name: true, email: true, staffRole: true },
            },
          },
        },
        _count: {
          select: { shifts: true },
        },
      },
    });

    if (!location || location.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error("Get location error:", error);
    return NextResponse.json(
      { error: "Failed to get location" },
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { name, address, latitude, longitude, clockInRadiusMetres, isActive, breakRules } = await req.json();

    const location = await prisma.location.findUnique({
      where: { id },
    });

    if (!location || location.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const updatedLocation = await prisma.location.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        address: address !== undefined ? address : undefined,
        latitude: latitude !== undefined ? latitude : undefined,
        longitude: longitude !== undefined ? longitude : undefined,
        clockInRadiusMetres: clockInRadiusMetres !== undefined ? clockInRadiusMetres : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        breakRules: breakRules !== undefined ? breakRules : undefined,
      },
    });

    return NextResponse.json(updatedLocation);
  } catch (error) {
    console.error("Update location error:", error);
    return NextResponse.json(
      { error: "Failed to update location" },
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

    const location = await prisma.location.findUnique({
      where: { id },
    });

    if (!location || location.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    await prisma.location.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete location error:", error);
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    );
  }
}
