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

function getWeekEnd(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 7);
  return d;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const weekOffset = parseInt(searchParams.get("weekOffset") || "0");

    // Calculate the week
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + weekOffset * 7);
    const weekStart = getMonday(targetDate);
    const weekEnd = getWeekEnd(weekStart);

    const locationFilter = locationId && locationId !== "all" ? { locationId } : {};

    // Get all data in parallel
    const [
      activities,
      weeklyLogs,
      weeklyTargets,
      latestMetrics,
      staffLeaderboard,
      recentLogs,
    ] = await Promise.all([
      // All active activities
      prisma.growthActivity.findMany({
        where: { organizationId: session.user.organizationId, isActive: true },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      }),

      // This week's activity logs grouped by category
      prisma.growthActivityLog.groupBy({
        by: ["activityId"],
        where: {
          organizationId: session.user.organizationId,
          completedAt: { gte: weekStart, lt: weekEnd },
          ...locationFilter,
        },
        _count: { id: true },
        _sum: { pointsEarned: true },
      }),

      // Weekly targets
      prisma.growthTarget.findMany({
        where: {
          organizationId: session.user.organizationId,
          weekStart,
          ...(locationId && locationId !== "all" ? { OR: [{ locationId }, { locationId: null }] } : {}),
        },
      }),

      // Latest metrics for each category
      Promise.all(
        ["MEMBERSHIP", "KIDS_CLUB", "EXTERNAL_GROUPS"].map(async (category) => {
          const metric = await prisma.growthMetric.findFirst({
            where: {
              organizationId: session.user.organizationId,
              category,
              metricType: "TOTAL",
              ...locationFilter,
            },
            orderBy: { recordedAt: "desc" },
          });
          return { category, metric };
        })
      ),

      // Staff leaderboard this week
      prisma.growthActivityLog.groupBy({
        by: ["completedById"],
        where: {
          organizationId: session.user.organizationId,
          completedAt: { gte: weekStart, lt: weekEnd },
          ...locationFilter,
        },
        _count: { id: true },
        _sum: { pointsEarned: true },
        orderBy: { _sum: { pointsEarned: "desc" } },
        take: 10,
      }),

      // Recent activity logs
      prisma.growthActivityLog.findMany({
        where: {
          organizationId: session.user.organizationId,
          completedAt: { gte: weekStart, lt: weekEnd },
          ...locationFilter,
        },
        include: {
          activity: { select: { id: true, name: true, category: true, points: true } },
          completedBy: { select: { id: true, name: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 20,
      }),
    ]);

    // Get user names for leaderboard
    const userIds = staffLeaderboard.map((s) => s.completedById);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    // Build activity lookup
    const activityMap = new Map(activities.map((a) => [a.id, a]));

    // Calculate category summaries
    const categorySummaries = ["MEMBERSHIP", "KIDS_CLUB", "EXTERNAL_GROUPS"].map((category) => {
      const categoryActivities = activities.filter((a) => a.category === category);
      const categoryActivityIds = categoryActivities.map((a) => a.id);

      const logsForCategory = weeklyLogs.filter((l) => categoryActivityIds.includes(l.activityId));
      const completedCount = logsForCategory.reduce((sum, l) => sum + l._count.id, 0);
      const pointsEarned = logsForCategory.reduce((sum, l) => sum + (l._sum.pointsEarned || 0), 0);

      const target = weeklyTargets.find((t) => t.category === category);
      const latestMetric = latestMetrics.find((m) => m.category === category)?.metric;

      return {
        category,
        activitiesCompleted: completedCount,
        targetActivities: target?.activityTarget || 0,
        pointsEarned,
        currentMetric: latestMetric?.value || null,
        metricTarget: target?.metricTarget || null,
        completionRate: target?.activityTarget ? Math.round((completedCount / target.activityTarget) * 100) : 0,
      };
    });

    // Format leaderboard
    const leaderboard = staffLeaderboard.map((entry) => ({
      userId: entry.completedById,
      name: userMap.get(entry.completedById) || "Unknown",
      activitiesCompleted: entry._count.id,
      pointsEarned: entry._sum.pointsEarned || 0,
    }));

    return NextResponse.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      categorySummaries,
      leaderboard,
      recentActivity: recentLogs,
      activities,
      targets: weeklyTargets,
    });
  } catch (error) {
    console.error("Get growth dashboard error:", error);
    return NextResponse.json({ error: "Failed to get dashboard data" }, { status: 500 });
  }
}
