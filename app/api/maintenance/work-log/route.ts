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

// GET all work logs
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50");

    const workLogs = await prisma.maintenanceWorkLog.findMany({
      where: {
        organizationId: user.organizationId,
        ...(locationId && { locationId }),
        ...(category && { category }),
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
        loggedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { completedAt: "desc" },
      take: limit,
    });

    return NextResponse.json(workLogs);
  } catch (error) {
    console.error("Get work logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch work logs" },
      { status: 500 }
    );
  }
}

// POST create new work log
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    // Managers and admins can log work
    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      category,
      status,
      completedBy,
      completedAt,
      locationId,
      photoUrls,
      partsUsed,
      estimatedCost,
    } = body;

    if (!title || !locationId || !completedBy) {
      return NextResponse.json(
        { error: "Title, location, and completedBy are required" },
        { status: 400 }
      );
    }

    // Verify location belongs to org
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        organizationId: user.organizationId,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const workLog = await prisma.maintenanceWorkLog.create({
      data: {
        title,
        description: description || null,
        category: category || "REPAIR",
        status: status || "COMPLETED",
        completedBy,
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        locationId,
        loggedById: user.id,
        photoUrls: JSON.stringify(photoUrls || []),
        partsUsed: partsUsed || null,
        estimatedCost: estimatedCost || null,
        organizationId: user.organizationId,
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
        loggedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(workLog, { status: 201 });
  } catch (error) {
    console.error("Create work log error:", error);
    return NextResponse.json(
      { error: "Failed to create work log" },
      { status: 500 }
    );
  }
}
