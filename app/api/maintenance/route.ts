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

// GET maintenance logs with filters
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    // Only managers and admins can view maintenance
    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const checkTypeId = searchParams.get("checkTypeId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: {
      organizationId: string;
      locationId?: string;
      checkTypeId?: string;
      status?: string;
      checkDate?: { gte?: Date; lte?: Date };
    } = {
      organizationId: user.organizationId,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    if (checkTypeId) {
      where.checkTypeId = checkTypeId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.checkDate = {};
      if (startDate) {
        where.checkDate.gte = new Date(startDate);
      }
      if (endDate) {
        // Add a day to include the end date
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.checkDate.lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.maintenanceLog.findMany({
        where,
        include: {
          checkType: {
            select: {
              id: true,
              name: true,
              frequencyDays: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
          signedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { checkDate: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.maintenanceLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get maintenance logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance logs" },
      { status: 500 }
    );
  }
}

// POST create a new maintenance log
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    // Only managers and admins can create maintenance logs
    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      checkTypeId,
      locationId,
      status,
      notes,
      issues,
      signature,
      checkDate,
    } = body;

    // Validate required fields
    if (!checkTypeId || !locationId || !signature) {
      return NextResponse.json(
        { error: "Check type, location, and signature are required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["PASS", "FAIL", "NEEDS_ATTENTION"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be PASS, FAIL, or NEEDS_ATTENTION" },
        { status: 400 }
      );
    }

    // Verify check type exists and belongs to org
    const checkType = await prisma.maintenanceCheckType.findUnique({
      where: { id: checkTypeId },
    });

    if (!checkType || checkType.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "Check type not found" },
        { status: 404 }
      );
    }

    // Verify location exists and belongs to org
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location || location.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const log = await prisma.maintenanceLog.create({
      data: {
        checkTypeId,
        locationId,
        status: status || "PASS",
        notes: notes || null,
        issues: issues ? JSON.stringify(issues) : null,
        signature,
        signedAt: new Date(),
        signedById: user.id,
        checkDate: checkDate ? new Date(checkDate) : new Date(),
        organizationId: user.organizationId,
      },
      include: {
        checkType: {
          select: {
            id: true,
            name: true,
            frequencyDays: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        signedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Create maintenance log error:", error);
    return NextResponse.json(
      { error: "Failed to create maintenance log" },
      { status: 500 }
    );
  }
}
