import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateStaffCost,
  getEffectiveHourlyRate,
} from "@/lib/uk-payroll";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can access analytics
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // Format: "2024-01"
    const locationId = searchParams.get("locationId");

    if (!month) {
      return NextResponse.json(
        { error: "Month parameter is required (format: YYYY-MM)" },
        { status: 400 }
      );
    }

    // Parse month to get date range
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Get previous month for variance calculation
    const prevMonthStart = new Date(year, monthNum - 2, 1);
    const prevMonthEnd = new Date(year, monthNum - 1, 0, 23, 59, 59, 999);

    const isAdmin = session.user.role === "ADMIN";

    // Fetch all staff in the organization
    const allStaff = await prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      select: {
        id: true,
        name: true,
        role: true,
        paymentType: true,
        monthlySalary: true,
        categoryRates: {
          select: { categoryId: true, hourlyRate: true },
        },
      },
    });

    // Build where clause for time entries
    const timeEntryWhere: {
      status: string;
      clockIn: { gte: Date; lte: Date };
      user: { organizationId: string };
      shift?: { locationId: string };
    } = {
      status: "APPROVED",
      clockIn: { gte: startDate, lte: endDate },
      user: { organizationId: session.user.organizationId },
    };

    if (locationId) {
      timeEntryWhere.shift = { locationId };
    }

    // Fetch current month time entries with user and shift details
    const timeEntries = await prisma.timeEntry.findMany({
      where: timeEntryWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            paymentType: true,
            monthlySalary: true,
            categoryRates: {
              select: { categoryId: true, hourlyRate: true },
            },
          },
        },
        shift: {
          select: {
            id: true,
            locationId: true,
            categoryId: true,
            location: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, hourlyRate: true } },
          },
        },
      },
    });

    // Fetch previous month time entries for variance
    const prevTimeEntryWhere = {
      ...timeEntryWhere,
      clockIn: { gte: prevMonthStart, lte: prevMonthEnd },
    };

    const prevTimeEntries = await prisma.timeEntry.findMany({
      where: prevTimeEntryWhere,
      include: {
        user: {
          select: {
            id: true,
            role: true,
            paymentType: true,
            monthlySalary: true,
            categoryRates: {
              select: { categoryId: true, hourlyRate: true },
            },
          },
        },
        shift: {
          select: {
            categoryId: true,
            category: { select: { hourlyRate: true } },
          },
        },
      },
    });

    // Fetch all locations for the organization
    const locations = await prisma.location.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // Calculate hours from time entry
    const calculateHours = (entry: { clockIn: Date; clockOut: Date | null; totalBreak: number }) => {
      if (!entry.clockOut) return 0;
      const clockIn = new Date(entry.clockIn);
      const clockOut = new Date(entry.clockOut);
      const totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
      const workedMinutes = totalMinutes - (entry.totalBreak || 0);
      return Math.max(0, workedMinutes / 60);
    };

    // Group by staff member
    const staffCosts: Record<string, {
      userId: string;
      name: string;
      role: string;
      paymentType: string;
      hours: number;
      grossPay: number;
      holidayAccrual: number;
      employeeNI: number;
      employerNI: number;
      totalCost: number;
      locationBreakdown: Record<string, { hours: number; grossPay: number }>;
    }> = {};

    // First, add monthly salaried staff with their fixed salary
    for (const staff of allStaff) {
      if (staff.paymentType === "MONTHLY" && staff.monthlySalary) {
        const costs = calculateStaffCost(staff.monthlySalary, "MONTHLY");
        staffCosts[staff.id] = {
          userId: staff.id,
          name: staff.name,
          role: staff.role,
          paymentType: staff.paymentType,
          hours: 0, // Will be updated from time entries if any
          grossPay: costs.grossPay,
          holidayAccrual: costs.holidayAccrual,
          employeeNI: costs.employeeNI,
          employerNI: costs.employerNI,
          totalCost: costs.totalCost,
          locationBreakdown: {},
        };
      }
    }

    // Process time entries for hourly staff and hours tracking for monthly staff
    for (const entry of timeEntries) {
      if (!entry.clockOut) continue;

      const userId = entry.user.id;
      const hours = calculateHours(entry);
      const locationId = entry.shift?.location?.id || "unassigned";

      // For HOURLY staff, calculate pay based on hours worked
      if (entry.user.paymentType === "HOURLY") {
        const categoryRate = entry.shift?.category?.hourlyRate || 0;
        const categoryId = entry.shift?.categoryId || "";
        const hourlyRate = getEffectiveHourlyRate(
          categoryRate,
          entry.user.categoryRates,
          categoryId
        );

        const grossPay = hours * hourlyRate;

        if (!staffCosts[userId]) {
          staffCosts[userId] = {
            userId,
            name: entry.user.name,
            role: entry.user.role,
            paymentType: entry.user.paymentType,
            hours: 0,
            grossPay: 0,
            holidayAccrual: 0,
            employeeNI: 0,
            employerNI: 0,
            totalCost: 0,
            locationBreakdown: {},
          };
        }

        staffCosts[userId].hours += hours;
        staffCosts[userId].grossPay += grossPay;

        // Location breakdown
        if (!staffCosts[userId].locationBreakdown[locationId]) {
          staffCosts[userId].locationBreakdown[locationId] = { hours: 0, grossPay: 0 };
        }
        staffCosts[userId].locationBreakdown[locationId].hours += hours;
        staffCosts[userId].locationBreakdown[locationId].grossPay += grossPay;
      } else {
        // For MONTHLY staff, just track hours worked (pay is fixed)
        if (staffCosts[userId]) {
          staffCosts[userId].hours += hours;

          // Location breakdown for hours
          if (!staffCosts[userId].locationBreakdown[locationId]) {
            staffCosts[userId].locationBreakdown[locationId] = { hours: 0, grossPay: 0 };
          }
          staffCosts[userId].locationBreakdown[locationId].hours += hours;
        }
      }
    }

    // Calculate NI and holiday accrual for hourly staff
    for (const staff of Object.values(staffCosts)) {
      if (staff.paymentType === "HOURLY") {
        const costs = calculateStaffCost(staff.grossPay, staff.paymentType);
        staff.grossPay = costs.grossPay;
        staff.holidayAccrual = costs.holidayAccrual;
        staff.employeeNI = costs.employeeNI;
        staff.employerNI = costs.employerNI;
        staff.totalCost = costs.totalCost;
      }
      staff.hours = Math.round(staff.hours * 100) / 100;
    }

    // Calculate previous month total for variance
    let prevMonthTotal = 0;

    // Add monthly staff costs for previous month (same as current if they had salary)
    for (const staff of allStaff) {
      if (staff.paymentType === "MONTHLY" && staff.monthlySalary) {
        const costs = calculateStaffCost(staff.monthlySalary, "MONTHLY");
        prevMonthTotal += costs.totalCost;
      }
    }

    // Add hourly staff costs from previous month time entries
    const prevHourlyCosts: Record<string, number> = {};
    for (const entry of prevTimeEntries) {
      if (!entry.clockOut) continue;
      if (entry.user.paymentType !== "HOURLY") continue;

      const hours = calculateHours(entry);
      const categoryRate = entry.shift?.category?.hourlyRate || 0;
      const categoryId = entry.shift?.categoryId || "";
      const hourlyRate = getEffectiveHourlyRate(
        categoryRate,
        entry.user.categoryRates,
        categoryId
      );

      const grossPay = hours * hourlyRate;
      prevHourlyCosts[entry.user.id] = (prevHourlyCosts[entry.user.id] || 0) + grossPay;
    }

    // Calculate NI for previous month hourly totals
    for (const grossPay of Object.values(prevHourlyCosts)) {
      const costs = calculateStaffCost(grossPay, "HOURLY");
      prevMonthTotal += costs.totalCost;
    }

    // Calculate totals
    const staffList = Object.values(staffCosts);
    const totals = staffList.reduce(
      (acc, staff) => ({
        hours: acc.hours + staff.hours,
        grossPay: acc.grossPay + staff.grossPay,
        holidayAccrual: acc.holidayAccrual + staff.holidayAccrual,
        employeeNI: acc.employeeNI + staff.employeeNI,
        employerNI: acc.employerNI + staff.employerNI,
        totalCost: acc.totalCost + staff.totalCost,
      }),
      { hours: 0, grossPay: 0, holidayAccrual: 0, employeeNI: 0, employerNI: 0, totalCost: 0 }
    );

    // Round totals
    totals.hours = Math.round(totals.hours * 100) / 100;
    totals.grossPay = Math.round(totals.grossPay * 100) / 100;
    totals.holidayAccrual = Math.round(totals.holidayAccrual * 100) / 100;
    totals.employeeNI = Math.round(totals.employeeNI * 100) / 100;
    totals.employerNI = Math.round(totals.employerNI * 100) / 100;
    totals.totalCost = Math.round(totals.totalCost * 100) / 100;

    // Calculate variance
    prevMonthTotal = Math.round(prevMonthTotal * 100) / 100;
    const variance = {
      amount: Math.round((totals.totalCost - prevMonthTotal) * 100) / 100,
      percentage: prevMonthTotal > 0
        ? Math.round(((totals.totalCost - prevMonthTotal) / prevMonthTotal) * 10000) / 100
        : 0,
      previousMonthTotal: prevMonthTotal,
    };

    // Group by location
    const locationCosts: Record<string, {
      locationId: string;
      locationName: string;
      hours: number;
      grossPay: number;
      holidayAccrual: number;
      employerNI: number;
      totalCost: number;
      staff: typeof staffList;
    }> = {};

    // Initialize locations
    for (const loc of locations) {
      locationCosts[loc.id] = {
        locationId: loc.id,
        locationName: loc.name,
        hours: 0,
        grossPay: 0,
        holidayAccrual: 0,
        employerNI: 0,
        totalCost: 0,
        staff: [],
      };
    }

    // Aggregate by location from staff data
    for (const staff of staffList) {
      for (const [locId, data] of Object.entries(staff.locationBreakdown)) {
        if (locationCosts[locId]) {
          locationCosts[locId].hours += data.hours;
          locationCosts[locId].grossPay += data.grossPay;
        }
      }
    }

    // Recalculate location totals with proper NI/holiday
    for (const loc of Object.values(locationCosts)) {
      // For simplicity, estimate location-level costs based on proportion
      // (In reality, NI thresholds apply per-employee, not per-location)
      const costs = calculateStaffCost(loc.grossPay, "HOURLY"); // Assume hourly for location summary
      loc.holidayAccrual = costs.holidayAccrual;
      loc.employerNI = costs.employerNI;
      loc.totalCost = costs.totalCost;
      loc.hours = Math.round(loc.hours * 100) / 100;
    }

    // Filter staff list - non-admins can't see manager/admin salaries
    const visibleStaff = isAdmin
      ? staffList
      : staffList.filter(s => s.role === "EMPLOYEE");

    return NextResponse.json({
      period: {
        month,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totals,
      variance,
      staff: visibleStaff.sort((a, b) => b.totalCost - a.totalCost),
      locations: Object.values(locationCosts).filter(l => l.hours > 0),
      allLocations: locations,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
