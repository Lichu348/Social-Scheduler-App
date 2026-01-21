import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: {
      organizationId: string;
      locationId?: string;
      settingDate?: { gte?: Date; lte?: Date };
    } = {
      organizationId: session.user.organizationId,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    if (startDate || endDate) {
      where.settingDate = {};
      if (startDate) {
        where.settingDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.settingDate.lte = end;
      }
    }

    const signoffs = await prisma.settingSignoff.findMany({
      where,
      include: {
        signedOffBy: {
          select: { id: true, name: true, email: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: { settingDate: "desc" },
    });

    return NextResponse.json(signoffs);
  } catch (error) {
    console.error("Get setting signoffs error:", error);
    return NextResponse.json(
      { error: "Failed to get setting signoffs" },
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

    // Only managers and admins can create setting signoffs
    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      locationId,
      externalSetterName,
      inHouseSetterName,
      climbsTested,
      downClimbJugsOk,
      matsChecked,
      photos,
      notes,
      settingDate,
    } = await req.json();

    // Validate required fields
    if (!locationId || !externalSetterName || !inHouseSetterName) {
      return NextResponse.json(
        { error: "Location, external setter name, and in-house setter name are required" },
        { status: 400 }
      );
    }

    // Validate checklist items are confirmed
    if (!climbsTested || !downClimbJugsOk || !matsChecked) {
      return NextResponse.json(
        { error: "All safety checklist items must be confirmed" },
        { status: 400 }
      );
    }

    // Verify location belongs to organization
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        organizationId: session.user.organizationId,
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const signoff = await prisma.settingSignoff.create({
      data: {
        locationId,
        externalSetterName,
        inHouseSetterName,
        climbsTested: Boolean(climbsTested),
        downClimbJugsOk: Boolean(downClimbJugsOk),
        matsChecked: Boolean(matsChecked),
        photos: JSON.stringify(photos || []),
        notes: notes || null,
        settingDate: settingDate ? new Date(settingDate) : new Date(),
        signedOffById: session.user.id,
        organizationId: session.user.organizationId,
      },
      include: {
        signedOffBy: {
          select: { id: true, name: true, email: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(signoff);
  } catch (error) {
    console.error("Create setting signoff error:", error);
    return NextResponse.json(
      { error: "Failed to create setting signoff" },
      { status: 500 }
    );
  }
}
