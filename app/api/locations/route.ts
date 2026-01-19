import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locations = await prisma.location.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        _count: {
          select: { staff: true, shifts: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Get locations error:", error);
    return NextResponse.json(
      { error: "Failed to get locations" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, address, latitude, longitude, clockInRadiusMetres } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    const location = await prisma.location.create({
      data: {
        name,
        address: address || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        clockInRadiusMetres: clockInRadiusMetres ?? 100,
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error("Create location error:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
