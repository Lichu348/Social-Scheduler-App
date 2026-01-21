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
    const locationId = searchParams.get("locationId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const latest = searchParams.get("latest") === "true";

    if (latest) {
      // Get the most recent metric for each category
      const categories = ["MEMBERSHIP", "KIDS_CLUB", "EXTERNAL_GROUPS"];
      const latestMetrics = await Promise.all(
        categories.map(async (cat) => {
          const metric = await prisma.growthMetric.findFirst({
            where: {
              organizationId: session.user.organizationId,
              category: cat,
              metricType: "TOTAL",
              ...(locationId && locationId !== "all" && { locationId }),
            },
            orderBy: { recordedAt: "desc" },
            include: {
              recordedBy: { select: { id: true, name: true } },
              location: { select: { id: true, name: true } },
            },
          });
          return metric;
        })
      );

      return NextResponse.json(latestMetrics.filter(Boolean));
    }

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        recordedAt: {
          gte: new Date(startDate),
          lt: new Date(endDate),
        },
      };
    }

    const metrics = await prisma.growthMetric.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(category && { category }),
        ...(locationId && locationId !== "all" && { locationId }),
        ...dateFilter,
      },
      include: {
        recordedBy: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { recordedAt: "desc" },
      take: 100,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Get growth metrics error:", error);
    return NextResponse.json({ error: "Failed to get metrics" }, { status: 500 });
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

    const { category, metricType, value, notes, locationId } = await req.json();

    if (!category || !metricType || value === undefined) {
      return NextResponse.json({ error: "Category, metric type, and value are required" }, { status: 400 });
    }

    const metric = await prisma.growthMetric.create({
      data: {
        category,
        metricType,
        value: parseInt(value),
        notes,
        locationId: locationId || null,
        organizationId: session.user.organizationId,
        recordedById: session.user.id,
      },
      include: {
        recordedBy: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(metric);
  } catch (error) {
    console.error("Create growth metric error:", error);
    return NextResponse.json({ error: "Failed to record metric" }, { status: 500 });
  }
}
