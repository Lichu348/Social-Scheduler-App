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

// GET all pay periods
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const current = searchParams.get("current") === "true";

    const where: {
      organizationId: string;
      isActive?: boolean;
      startDate?: { lte: Date };
      endDate?: { gte: Date };
    } = {
      organizationId: user.organizationId,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    // If requesting current period, find the one that contains today
    if (current) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.startDate = { lte: today };
      where.endDate = { gte: today };
    }

    const payPeriods = await prisma.payPeriod.findMany({
      where,
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(payPeriods);
  } catch (error) {
    console.error("Get pay periods error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pay periods" },
      { status: 500 }
    );
  }
}

// POST create new pay period (admin only)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    // Only admins can create pay periods
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, startDate, endDate, payDate, notes } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Name, start date, and end date are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    const payPeriod = await prisma.payPeriod.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        payDate: payDate ? new Date(payDate) : null,
        notes: notes || null,
        organizationId: user.organizationId,
      },
    });

    return NextResponse.json(payPeriod, { status: 201 });
  } catch (error) {
    console.error("Create pay period error:", error);
    return NextResponse.json(
      { error: "Failed to create pay period" },
      { status: 500 }
    );
  }
}
