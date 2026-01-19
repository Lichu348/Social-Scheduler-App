import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can export
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const locationId = searchParams.get("locationId");
    const format = searchParams.get("format") || "xlsx";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch time entries with related data
    const entries = await prisma.timeEntry.findMany({
      where: {
        user: {
          organizationId: session.user.organizationId,
          ...(locationId ? { primaryLocationId: locationId } : {}),
        },
        clockIn: {
          gte: start,
          lte: end,
        },
        clockOut: { not: null }, // Only completed entries
      },
      include: {
        user: {
          select: { name: true, email: true, primaryLocation: { select: { name: true } } },
        },
        shift: {
          include: {
            category: {
              select: { name: true, hourlyRate: true },
            },
            location: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [
        { user: { name: "asc" } },
        { clockIn: "asc" },
      ],
    });

    // Transform data for export
    const exportData = entries.map((entry) => {
      const clockIn = new Date(entry.clockIn);
      const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;

      const grossHours = clockOut
        ? (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
        : 0;
      const breakMinutes = entry.totalBreak;
      const netHours = Math.max(0, grossHours - breakMinutes / 60);

      const hourlyRate = entry.shift?.category?.hourlyRate || 0;
      const totalPay = netHours * hourlyRate;

      return {
        "Employee Name": entry.user.name,
        "Employee Email": entry.user.email,
        Location: entry.user.primaryLocation?.name || entry.shift?.location?.name || "Unassigned",
        Date: clockIn.toLocaleDateString(),
        "Clock In": clockIn.toLocaleTimeString(),
        "Clock Out": clockOut?.toLocaleTimeString() || "",
        "Break Duration (min)": breakMinutes,
        "Gross Hours": Number(grossHours.toFixed(2)),
        "Net Hours": Number(netHours.toFixed(2)),
        "Shift Category": entry.shift?.category?.name || "Uncategorized",
        "Hourly Rate ($)": hourlyRate,
        "Total Pay ($)": Number(totalPay.toFixed(2)),
        Status: entry.status,
        Notes: entry.notes || "",
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Employee Name
      { wch: 25 }, // Employee Email
      { wch: 18 }, // Location
      { wch: 12 }, // Date
      { wch: 12 }, // Clock In
      { wch: 12 }, // Clock Out
      { wch: 18 }, // Break Duration
      { wch: 12 }, // Gross Hours
      { wch: 12 }, // Net Hours
      { wch: 18 }, // Shift Category
      { wch: 14 }, // Hourly Rate
      { wch: 14 }, // Total Pay
      { wch: 10 }, // Status
      { wch: 30 }, // Notes
    ];
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");

    // Add summary sheet
    const summaryByEmployee = entries.reduce((acc, entry) => {
      const name = entry.user.name;
      if (!acc[name]) {
        acc[name] = { totalHours: 0, totalPay: 0 };
      }

      const clockIn = new Date(entry.clockIn);
      const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;
      const grossHours = clockOut
        ? (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
        : 0;
      const netHours = Math.max(0, grossHours - entry.totalBreak / 60);
      const hourlyRate = entry.shift?.category?.hourlyRate || 0;

      acc[name].totalHours += netHours;
      acc[name].totalPay += netHours * hourlyRate;
      return acc;
    }, {} as Record<string, { totalHours: number; totalPay: number }>);

    const summaryData = Object.entries(summaryByEmployee).map(([name, data]) => ({
      "Employee Name": name,
      "Total Net Hours": Number(data.totalHours.toFixed(2)),
      "Total Pay ($)": Number(data.totalPay.toFixed(2)),
    }));

    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: format as XLSX.BookType });

    // Return file
    const contentType =
      format === "csv"
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const filename = `timesheet_${startDate}_to_${endDate}.${format}`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export time entries error:", error);
    return NextResponse.json(
      { error: "Failed to export time entries" },
      { status: 500 }
    );
  }
}
