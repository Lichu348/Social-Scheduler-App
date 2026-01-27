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

// GET single cash up session
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;
    const { id } = await params;

    const cashUpSession = await prisma.cashUpSession.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
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
    });

    if (!cashUpSession) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(cashUpSession);
  } catch (error) {
    console.error("Get cash up session error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash up session" },
      { status: 500 }
    );
  }
}

// PATCH update cash up session
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "DUTY_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify session exists and belongs to org
    const existing = await prisma.cashUpSession.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const {
      expectedCash,
      expectedPdq,
      expectedOnline,
      expectedZRead,
      actualCash,
      actualPdq,
      actualOnline,
      actualZRead,
      giftCardsRedeemed,
      notes,
      status,
      reviewNotes,
    } = body;

    // Calculate discrepancies
    const eCash = expectedCash ?? existing.expectedCash;
    const ePdq = expectedPdq ?? existing.expectedPdq;
    const eOnline = expectedOnline ?? existing.expectedOnline;
    const aCash = actualCash ?? existing.actualCash;
    const aPdq = actualPdq ?? existing.actualPdq;
    const aOnline = actualOnline ?? existing.actualOnline;

    const cashDisc = aCash - eCash;
    const cardDisc = aPdq + aOnline - ePdq - eOnline;
    const totalDisc = cashDisc + cardDisc;

    // Check if being submitted or reviewed
    const isBeingSubmitted = status === "SUBMITTED" && existing.status !== "SUBMITTED";
    const isBeingReviewed = status === "REVIEWED" && existing.status !== "REVIEWED";

    const cashUpSession = await prisma.cashUpSession.update({
      where: { id },
      data: {
        ...(expectedCash !== undefined && { expectedCash }),
        ...(expectedPdq !== undefined && { expectedPdq }),
        ...(expectedOnline !== undefined && { expectedOnline }),
        ...(expectedZRead !== undefined && { expectedZRead }),
        ...(actualCash !== undefined && { actualCash }),
        ...(actualPdq !== undefined && { actualPdq }),
        ...(actualOnline !== undefined && { actualOnline }),
        ...(actualZRead !== undefined && { actualZRead }),
        ...(giftCardsRedeemed !== undefined && { giftCardsRedeemed }),
        cashDiscrepancy: cashDisc,
        cardDiscrepancy: cardDisc,
        totalDiscrepancy: totalDisc,
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
        ...(isBeingSubmitted && {
          completedById: user.id,
          completedAt: new Date(),
        }),
        ...(isBeingReviewed && {
          reviewedById: user.id,
          reviewedAt: new Date(),
        }),
        ...(reviewNotes !== undefined && { reviewNotes }),
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
    });

    return NextResponse.json(cashUpSession);
  } catch (error) {
    console.error("Update cash up session error:", error);
    return NextResponse.json(
      { error: "Failed to update cash up session" },
      { status: 500 }
    );
  }
}

// DELETE cash up session
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    // Only admins can delete
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify session exists and belongs to org
    const existing = await prisma.cashUpSession.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.cashUpSession.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete cash up session error:", error);
    return NextResponse.json(
      { error: "Failed to delete cash up session" },
      { status: 500 }
    );
  }
}
