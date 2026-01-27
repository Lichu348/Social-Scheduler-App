import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCashUpSessionSchema } from "@/lib/schemas";

interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  staffRole: string;
  organizationId: string;
  organizationName: string;
}

// GET all cash up sessions
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "DUTY_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "30");

    const sessions = await prisma.cashUpSession.findMany({
      where: {
        organizationId: user.organizationId,
        ...(locationId && { locationId }),
        ...(status && { status }),
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
        completedBy: {
          select: { id: true, name: true },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Get cash up sessions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash up sessions" },
      { status: 500 }
    );
  }
}

// POST create new cash up session
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "DUTY_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = createCashUpSessionSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const {
      date,
      locationId,
      expectedCash,
      expectedPdq,
      actualCash,
      actualPdq,
      notes,
      status,
    } = parseResult.data;

    // Verify location belongs to org
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        organizationId: user.organizationId,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Calculate discrepancies
    const cashDisc = (actualCash || 0) - (expectedCash || 0);
    const cardDisc = (actualPdq || 0) - (expectedPdq || 0);
    const totalDisc = cashDisc + cardDisc;

    // Parse date and set to start of day
    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);

    // Check if session already exists for this date/location
    const existing = await prisma.cashUpSession.findUnique({
      where: {
        organizationId_locationId_date: {
          organizationId: user.organizationId,
          locationId,
          date: sessionDate,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A cash up session already exists for this date and location" },
        { status: 400 }
      );
    }

    const isSubmitted = status === "SUBMITTED";

    const cashUpSession = await prisma.cashUpSession.create({
      data: {
        date: sessionDate,
        locationId,
        expectedCash: expectedCash || 0,
        expectedPdq: expectedPdq || 0,
        expectedOnline: 0,
        expectedZRead: 0,
        actualCash: actualCash || 0,
        actualPdq: actualPdq || 0,
        actualOnline: 0,
        actualZRead: 0,
        giftCardsRedeemed: 0,
        cashDiscrepancy: cashDisc,
        cardDiscrepancy: cardDisc,
        totalDiscrepancy: totalDisc,
        notes: notes || null,
        status: status || "DRAFT",
        completedById: isSubmitted ? user.id : null,
        completedAt: isSubmitted ? new Date() : null,
        organizationId: user.organizationId,
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
        completedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(cashUpSession, { status: 201 });
  } catch (error) {
    console.error("Create cash up session error:", error);
    return NextResponse.json(
      { error: "Failed to create cash up session" },
      { status: 500 }
    );
  }
}
