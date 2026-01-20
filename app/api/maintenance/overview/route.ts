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

// GET maintenance overview - due checks, completed today, issues
export async function GET() {
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

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active check types
    const checkTypes = await prisma.maintenanceCheckType.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    // Get all active locations
    const locations = await prisma.location.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    // Get logs from today
    const todayLogs = await prisma.maintenanceLog.findMany({
      where: {
        organizationId: user.organizationId,
        checkDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        checkType: true,
        location: true,
        signedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get recent logs with issues (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const issuesLogs = await prisma.maintenanceLog.findMany({
      where: {
        organizationId: user.organizationId,
        checkDate: {
          gte: thirtyDaysAgo,
        },
        OR: [
          { status: "FAIL" },
          { status: "NEEDS_ATTENTION" },
        ],
      },
      include: {
        checkType: true,
        location: true,
        signedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { checkDate: "desc" },
      take: 20,
    });

    // Get the last log for each check type per location to determine due status
    const lastLogsPerCheckLocation = await prisma.maintenanceLog.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: { checkDate: "desc" },
      distinct: ["checkTypeId", "locationId"],
      include: {
        checkType: true,
        location: true,
      },
    });

    // Build check status matrix for each location
    const locationCheckStatus = locations.map((location) => {
      const checks = checkTypes.map((checkType) => {
        // Find today's log for this check/location
        const todayLog = todayLogs.find(
          (log) => log.checkTypeId === checkType.id && log.locationId === location.id
        );

        // Find last log for this check/location
        const lastLog = lastLogsPerCheckLocation.find(
          (log) => log.checkTypeId === checkType.id && log.locationId === location.id
        );

        // Calculate if the check is due
        let isDue = true;
        let isOverdue = false;
        let daysSinceLastCheck: number | null = null;

        if (lastLog) {
          const lastCheckDate = new Date(lastLog.checkDate);
          lastCheckDate.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor(
            (today.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          daysSinceLastCheck = daysDiff;
          isDue = daysDiff >= checkType.frequencyDays;
          isOverdue = daysDiff > checkType.frequencyDays;
        }

        // Determine status
        let status: "completed" | "due" | "overdue" | "not_due" = "not_due";
        if (todayLog) {
          status = "completed";
        } else if (isOverdue) {
          status = "overdue";
        } else if (isDue) {
          status = "due";
        }

        return {
          checkTypeId: checkType.id,
          checkTypeName: checkType.name,
          frequencyDays: checkType.frequencyDays,
          status,
          todayLog: todayLog
            ? {
                id: todayLog.id,
                status: todayLog.status,
                notes: todayLog.notes,
                signature: todayLog.signature,
                signedBy: todayLog.signedBy,
                signedAt: todayLog.signedAt,
              }
            : null,
          lastLog: lastLog
            ? {
                id: lastLog.id,
                checkDate: lastLog.checkDate,
                status: lastLog.status,
              }
            : null,
          daysSinceLastCheck,
        };
      });

      return {
        locationId: location.id,
        locationName: location.name,
        checks,
      };
    });

    // Calculate summary stats
    const totalChecks = locations.length * checkTypes.length;
    const completedToday = todayLogs.length;
    const dueToday = locationCheckStatus.reduce(
      (acc, loc) => acc + loc.checks.filter((c) => c.status === "due" || c.status === "overdue").length,
      0
    );
    const overdueChecks = locationCheckStatus.reduce(
      (acc, loc) => acc + loc.checks.filter((c) => c.status === "overdue").length,
      0
    );
    const openIssues = issuesLogs.length;

    return NextResponse.json({
      summary: {
        totalChecks,
        completedToday,
        dueToday,
        overdueChecks,
        openIssues,
      },
      checkTypes,
      locations,
      locationCheckStatus,
      recentIssues: issuesLogs,
    });
  } catch (error) {
    console.error("Get maintenance overview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance overview" },
      { status: 500 }
    );
  }
}
