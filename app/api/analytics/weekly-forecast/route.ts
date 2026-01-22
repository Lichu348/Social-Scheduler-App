import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEffectiveHourlyRate } from "@/lib/uk-payroll";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can access forecast
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const weekStartParam = searchParams.get("weekStart");
    const locationId = searchParams.get("locationId");

    // Default to current week's Monday
    let weekStart: Date;
    if (weekStartParam) {
      weekStart = new Date(weekStartParam);
    } else {
      weekStart = new Date();
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday
      weekStart = new Date(weekStart.setDate(diff));
    }
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Fetch all staff with their contracted hours and rates
    const staff = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(locationId ? {
          locationAccess: { some: { locationId } },
        } : {}),
      },
      select: {
        id: true,
        name: true,
        role: true,
        paymentType: true,
        monthlySalary: true,
        contractedHours: true,
        categoryRates: {
          select: { categoryId: true, hourlyRate: true },
        },
      },
    });

    // Fetch shifts for the week
    const shifts = await prisma.shift.findMany({
      where: {
        organizationId: session.user.organizationId,
        startTime: { gte: weekStart, lt: weekEnd },
        ...(locationId ? { locationId } : {}),
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        scheduledBreakMinutes: true,
        assignedToId: true,
        categoryId: true,
        category: {
          select: { id: true, name: true, hourlyRate: true },
        },
      },
    });

    // Fetch organization settings for break calculation mode
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { breakRules: true, breakCalculationMode: true },
    });
    const breakCalculationMode = organization?.breakCalculationMode || "PER_SHIFT";
    const breakRulesJson = organization?.breakRules || "[]";

    // Fetch default category for contracted hours calculation
    const defaultCategory = await prisma.shiftCategory.findFirst({
      where: { organizationId: session.user.organizationId, isActive: true },
      select: { hourlyRate: true },
      orderBy: { createdAt: "asc" },
    });
    const defaultHourlyRate = defaultCategory?.hourlyRate || 10; // Fallback to £10/hr

    // Helper function to calculate break minutes from rules
    const calculateBreakMinutes = (hours: number): number => {
      try {
        const rules = JSON.parse(breakRulesJson) as { minHours: number; breakMinutes: number }[];
        const applicableRule = rules
          .filter((r) => hours >= r.minHours)
          .sort((a, b) => b.minHours - a.minHours)[0];
        return applicableRule?.breakMinutes || 0;
      } catch {
        return 0;
      }
    };

    // Calculate contracted costs
    let totalContractedHours = 0;
    let totalContractedCost = 0;
    const staffContracted: Array<{
      userId: string;
      name: string;
      contractedHours: number;
      estimatedCost: number;
    }> = [];

    for (const member of staff) {
      if (member.contractedHours && member.contractedHours > 0) {
        // For hourly staff, calculate cost based on their rate
        // For monthly staff, show hours but calculate cost differently
        let estimatedCost = 0;

        if (member.paymentType === "HOURLY") {
          // Use their category rate if they have one, otherwise default rate
          const rate = member.categoryRates.length > 0
            ? member.categoryRates[0].hourlyRate
            : defaultHourlyRate;
          estimatedCost = member.contractedHours * rate;
        } else if (member.paymentType === "MONTHLY" && member.monthlySalary) {
          // For monthly staff, calculate weekly portion of salary
          estimatedCost = member.monthlySalary / 4.33; // Approx weeks per month
        }

        totalContractedHours += member.contractedHours;
        totalContractedCost += estimatedCost;

        staffContracted.push({
          userId: member.id,
          name: member.name,
          contractedHours: member.contractedHours,
          estimatedCost,
        });
      }
    }

    // Calculate scheduled costs from shifts
    let totalScheduledHours = 0;
    let totalScheduledCost = 0;
    const staffScheduled: Record<string, {
      userId: string;
      name: string;
      scheduledHours: number;
      estimatedCost: number;
    }> = {};

    if (breakCalculationMode === "PER_DAY") {
      // Group shifts by assignee and day, then calculate daily breaks
      const shiftsByUserAndDay: Record<string, Record<string, typeof shifts>> = {};

      for (const shift of shifts) {
        if (!shift.assignedToId) continue;
        const dayKey = new Date(shift.startTime).toISOString().split("T")[0];
        if (!shiftsByUserAndDay[shift.assignedToId]) {
          shiftsByUserAndDay[shift.assignedToId] = {};
        }
        if (!shiftsByUserAndDay[shift.assignedToId][dayKey]) {
          shiftsByUserAndDay[shift.assignedToId][dayKey] = [];
        }
        shiftsByUserAndDay[shift.assignedToId][dayKey].push(shift);
      }

      // Calculate hours and costs for each user's day
      for (const [userId, days] of Object.entries(shiftsByUserAndDay)) {
        const assignee = staff.find((s) => s.id === userId);
        if (!assignee) continue;

        for (const [, dayShifts] of Object.entries(days)) {
          // Sum up gross hours and costs for the day
          let dayGrossMinutes = 0;
          let dayCost = 0;

          for (const shift of dayShifts) {
            const start = new Date(shift.startTime);
            const end = new Date(shift.endTime);
            const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
            dayGrossMinutes += durationMinutes;

            const categoryRate = shift.category?.hourlyRate || defaultHourlyRate;
            let hourlyRate = categoryRate;
            if (assignee.paymentType === "HOURLY") {
              hourlyRate = getEffectiveHourlyRate(
                categoryRate,
                assignee.categoryRates,
                shift.categoryId || ""
              );
            }
            // Cost before break deduction (we'll adjust after)
            if (assignee.paymentType !== "MONTHLY") {
              dayCost += (durationMinutes / 60) * hourlyRate;
            }
          }

          // Apply break rules to the day's total
          const dayGrossHours = dayGrossMinutes / 60;
          const dailyBreakMinutes = calculateBreakMinutes(dayGrossHours);
          const dayNetHours = dayGrossHours - (dailyBreakMinutes / 60);

          // Adjust cost for the break
          if (assignee.paymentType !== "MONTHLY" && dayGrossHours > 0) {
            const breakHours = dailyBreakMinutes / 60;
            const avgRate = dayCost / dayGrossHours;
            dayCost -= breakHours * avgRate;
          }

          totalScheduledHours += dayNetHours;
          totalScheduledCost += dayCost;

          if (!staffScheduled[userId]) {
            staffScheduled[userId] = {
              userId,
              name: assignee.name,
              scheduledHours: 0,
              estimatedCost: 0,
            };
          }
          staffScheduled[userId].scheduledHours += dayNetHours;
          staffScheduled[userId].estimatedCost += dayCost;
        }
      }

      // Handle unassigned shifts (no break calculation needed)
      for (const shift of shifts) {
        if (shift.assignedToId) continue;
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        const breakMinutes = shift.scheduledBreakMinutes || 0;
        const netHours = (durationMinutes - breakMinutes) / 60;
        totalScheduledHours += netHours;
      }
    } else {
      // PER_SHIFT mode: original calculation
      for (const shift of shifts) {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        const breakMinutes = shift.scheduledBreakMinutes || 0;
        const netHours = (durationMinutes - breakMinutes) / 60;

        // Get the hourly rate
        const categoryRate = shift.category?.hourlyRate || defaultHourlyRate;
        const assignee = staff.find((s) => s.id === shift.assignedToId);

        let hourlyRate = categoryRate;
        if (assignee && assignee.paymentType === "HOURLY") {
          hourlyRate = getEffectiveHourlyRate(
            categoryRate,
            assignee.categoryRates,
            shift.categoryId || ""
          );
        }

        const shiftCost = assignee?.paymentType === "MONTHLY" ? 0 : netHours * hourlyRate;

        totalScheduledHours += netHours;
        totalScheduledCost += shiftCost;

        // Track per staff member
        if (shift.assignedToId && assignee) {
          if (!staffScheduled[shift.assignedToId]) {
            staffScheduled[shift.assignedToId] = {
              userId: shift.assignedToId,
              name: assignee.name,
              scheduledHours: 0,
              estimatedCost: 0,
            };
          }
          staffScheduled[shift.assignedToId].scheduledHours += netHours;
          staffScheduled[shift.assignedToId].estimatedCost += shiftCost;
        }
      }
    }

    // Calculate variance
    const hoursVariance = totalScheduledHours - totalContractedHours;
    const costVariance = totalScheduledCost - totalContractedCost;

    // Round values
    const round = (n: number) => Math.round(n * 100) / 100;

    return NextResponse.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      contracted: {
        totalHours: round(totalContractedHours),
        totalCost: round(totalContractedCost),
        staffCount: staffContracted.length,
        staff: staffContracted,
      },
      scheduled: {
        totalHours: round(totalScheduledHours),
        totalCost: round(totalScheduledCost),
        shiftCount: shifts.length,
        staff: Object.values(staffScheduled),
      },
      variance: {
        hours: round(hoursVariance),
        cost: round(costVariance),
        hoursPercent: totalContractedHours > 0
          ? round((hoursVariance / totalContractedHours) * 100)
          : 0,
        costPercent: totalContractedCost > 0
          ? round((costVariance / totalContractedCost) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error("Forecast error:", error);
    return NextResponse.json(
      { error: "Failed to fetch forecast" },
      { status: 500 }
    );
  }
}
