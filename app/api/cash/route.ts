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

    // For employees, restrict to their assigned locations
    let allowedLocationIds: string[] | null = null;
    if (session.user.role === "EMPLOYEE") {
      const staffLocations = await prisma.locationStaff.findMany({
        where: { userId: session.user.id },
        select: { locationId: true },
      });
      allowedLocationIds = staffLocations.map((sl) => sl.locationId);

      // If no locations assigned, return empty
      if (allowedLocationIds.length === 0) {
        return NextResponse.json({
          transactions: [],
          runningTotal: 0,
        });
      }
    }

    // Build where clause
    const where: {
      organizationId: string;
      locationId?: string | { in: string[] };
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      organizationId: session.user.organizationId,
    };

    if (locationId) {
      // If a specific location is requested, verify employee has access
      if (allowedLocationIds && !allowedLocationIds.includes(locationId)) {
        return NextResponse.json({ error: "Access denied to this location" }, { status: 403 });
      }
      where.locationId = locationId;
    } else if (allowedLocationIds) {
      // Filter to only assigned locations for employees
      where.locationId = { in: allowedLocationIds };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const transactions = await prisma.cashTransaction.findMany({
      where,
      include: {
        loggedBy: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate running total (all transactions for this org/location, respecting employee location restrictions)
    const totalWhere: {
      organizationId: string;
      locationId?: string | { in: string[] };
    } = {
      organizationId: session.user.organizationId,
    };
    if (locationId) {
      totalWhere.locationId = locationId;
    } else if (allowedLocationIds) {
      totalWhere.locationId = { in: allowedLocationIds };
    }
    const allTransactions = await prisma.cashTransaction.findMany({
      where: totalWhere,
      select: { amount: true },
    });

    const runningTotal = allTransactions.reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      transactions,
      runningTotal,
    });
  } catch (error) {
    console.error("Get cash transactions error:", error);
    return NextResponse.json(
      { error: "Failed to get cash transactions" },
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

    const { type, amount, notes, locationId } = await req.json();

    if (!type || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: "Type and amount are required" },
        { status: 400 }
      );
    }

    const validTypes = ["TAKING", "BANKING", "PURCHASE", "ADJUSTMENT"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid transaction type" },
        { status: 400 }
      );
    }

    // Determine the actual amount based on type
    // TAKING and positive ADJUSTMENT add money
    // BANKING, PURCHASE, and negative ADJUSTMENT remove money
    let finalAmount = Math.abs(amount);
    if (type === "BANKING" || type === "PURCHASE") {
      finalAmount = -finalAmount;
    } else if (type === "ADJUSTMENT") {
      // For adjustments, use the signed amount as provided
      finalAmount = amount;
    }

    const transaction = await prisma.cashTransaction.create({
      data: {
        type,
        amount: finalAmount,
        notes: notes || null,
        locationId: locationId || null,
        loggedById: session.user.id,
        organizationId: session.user.organizationId,
      },
      include: {
        loggedBy: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Create cash transaction error:", error);
    return NextResponse.json(
      { error: "Failed to create cash transaction" },
      { status: 500 }
    );
  }
}
