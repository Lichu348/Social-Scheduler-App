import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Helper to get Monday of a given week
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get("weekStart");
    const locationId = searchParams.get("locationId");

    // Default to current week
    const targetWeek = weekStart ? getMonday(new Date(weekStart)) : getMonday(new Date());

    const targets = await prisma.growthTarget.findMany({
      where: {
        organizationId: session.user.organizationId,
        weekStart: targetWeek,
        ...(locationId && locationId !== "all" && { locationId }),
      },
      include: {
        location: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { category: "asc" },
    });

    return NextResponse.json(targets);
  } catch (error) {
    console.error("Get growth targets error:", error);
    return NextResponse.json({ error: "Failed to get targets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { weekStart, category, activityTarget, metricTarget, notes, locationId } = await req.json();

    if (!category || activityTarget === undefined) {
      return NextResponse.json({ error: "Category and activity target are required" }, { status: 400 });
    }

    const targetWeek = weekStart ? getMonday(new Date(weekStart)) : getMonday(new Date());

    // Upsert the target
    const target = await prisma.growthTarget.upsert({
      where: {
        organizationId_locationId_weekStart_category: {
          organizationId: session.user.organizationId,
          locationId: locationId || null,
          weekStart: targetWeek,
          category,
        },
      },
      update: {
        activityTarget,
        metricTarget,
        notes,
      },
      create: {
        weekStart: targetWeek,
        category,
        activityTarget,
        metricTarget,
        notes,
        locationId: locationId || null,
        organizationId: session.user.organizationId,
        createdById: session.user.id,
      },
      include: {
        location: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(target);
  } catch (error) {
    console.error("Create/update growth target error:", error);
    return NextResponse.json({ error: "Failed to save target" }, { status: 500 });
  }
}
