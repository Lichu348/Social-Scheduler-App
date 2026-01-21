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
    const category = searchParams.get("category");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const locationId = searchParams.get("locationId");

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        completedAt: {
          gte: new Date(startDate),
          lt: new Date(endDate),
        },
      };
    } else if (startDate) {
      dateFilter = { completedAt: { gte: new Date(startDate) } };
    }

    const logs = await prisma.growthActivityLog.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(category && { activity: { category } }),
        ...(userId && { completedById: userId }),
        ...(locationId && locationId !== "all" && { locationId }),
        ...dateFilter,
      },
      include: {
        activity: {
          select: { id: true, name: true, category: true, activityType: true, points: true },
        },
        completedBy: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Get activity logs error:", error);
    return NextResponse.json({ error: "Failed to get activity logs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { activityId, notes, outcome, contactName, contactInfo, followUpDate, locationId } = await req.json();

    if (!activityId) {
      return NextResponse.json({ error: "Activity ID is required" }, { status: 400 });
    }

    // Get the activity to get its points
    const activity = await prisma.growthActivity.findFirst({
      where: {
        id: activityId,
        organizationId: session.user.organizationId,
      },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const log = await prisma.growthActivityLog.create({
      data: {
        activityId,
        notes,
        outcome: outcome || "COMPLETED",
        contactName,
        contactInfo,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        pointsEarned: activity.points,
        completedById: session.user.id,
        locationId: locationId || null,
        organizationId: session.user.organizationId,
      },
      include: {
        activity: {
          select: { id: true, name: true, category: true, activityType: true, points: true },
        },
        completedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("Create activity log error:", error);
    return NextResponse.json({ error: "Failed to log activity" }, { status: 500 });
  }
}
