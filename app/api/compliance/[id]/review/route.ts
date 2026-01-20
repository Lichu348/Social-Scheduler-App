import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST - Manager conducts a performance review
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { userId, rating, managerNotes, goals, managerSignature } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    if (!managerSignature) {
      return NextResponse.json({ error: "Manager signature is required" }, { status: 400 });
    }

    // Get the compliance item and verify it's a REVIEW type
    const item = await prisma.complianceItem.findUnique({
      where: { id },
    });

    if (!item || item.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Compliance item not found" }, { status: 404 });
    }

    if (item.type !== "REVIEW") {
      return NextResponse.json({ error: "This compliance item is not a review" }, { status: 400 });
    }

    // Verify user exists and manager has access
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        locationAccess: { select: { locationId: true } },
      },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Managers can only review users at their locations
    if (session.user.role === "MANAGER") {
      const managerLocations = await prisma.locationStaff.findMany({
        where: { userId: session.user.id },
        select: { locationId: true },
      });
      const managerLocationIds = managerLocations.map((l) => l.locationId);
      const userLocationIds = user.locationAccess.map((l) => l.locationId);

      const hasSharedLocation = userLocationIds.some((id) =>
        managerLocationIds.includes(id)
      );

      if (!hasSharedLocation) {
        return NextResponse.json(
          { error: "You can only review users at your locations" },
          { status: 403 }
        );
      }
    }

    // Calculate expiry date
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + item.validityMonths);

    // Create or update the review record
    const record = await prisma.userCompliance.upsert({
      where: {
        userId_complianceItemId: {
          userId,
          complianceItemId: id,
        },
      },
      update: {
        issueDate: now,
        expiryDate,
        rating,
        managerNotes: managerNotes || null,
        goals: goals || null,
        managerSignature,
        managerSignedAt: now,
        reviewedById: session.user.id,
        status: "ACTIVE",
        // Reset employee signature when manager updates review
        signature: null,
        signedAt: null,
        employeeComments: null,
      },
      create: {
        userId,
        complianceItemId: id,
        issueDate: now,
        expiryDate,
        rating,
        managerNotes: managerNotes || null,
        goals: goals || null,
        managerSignature,
        managerSignedAt: now,
        reviewedById: session.user.id,
        status: "ACTIVE",
      },
      include: {
        user: { select: { name: true, email: true } },
        complianceItem: { select: { name: true } },
      },
    });

    // Create notification for the employee
    await prisma.notification.create({
      data: {
        userId,
        type: "REVIEW_COMPLETED",
        title: "Performance Review Ready",
        message: `Your performance review has been completed by ${session.user.name}. Please review and acknowledge.`,
        link: "/dashboard/compliance",
      },
    });

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error("Conduct review error:", error);
    return NextResponse.json(
      { error: "Failed to conduct review" },
      { status: 500 }
    );
  }
}

// PATCH - Employee acknowledges and adds comments to their review
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { employeeComments, signature } = body;

    if (!signature) {
      return NextResponse.json({ error: "Signature is required" }, { status: 400 });
    }

    // Get the compliance item
    const item = await prisma.complianceItem.findUnique({
      where: { id },
    });

    if (!item || item.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Compliance item not found" }, { status: 404 });
    }

    if (item.type !== "REVIEW") {
      return NextResponse.json({ error: "This compliance item is not a review" }, { status: 400 });
    }

    // Find the user's review record
    const record = await prisma.userCompliance.findUnique({
      where: {
        userId_complianceItemId: {
          userId: session.user.id,
          complianceItemId: id,
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "No review found for you" }, { status: 404 });
    }

    if (!record.managerSignature) {
      return NextResponse.json(
        { error: "Review has not been completed by manager yet" },
        { status: 400 }
      );
    }

    // Update with employee acknowledgment
    const updatedRecord = await prisma.userCompliance.update({
      where: { id: record.id },
      data: {
        employeeComments: employeeComments || null,
        signature,
        signedAt: new Date(),
      },
      include: {
        user: { select: { name: true, email: true } },
        complianceItem: { select: { name: true } },
      },
    });

    // Notify the reviewer
    if (record.reviewedById) {
      await prisma.notification.create({
        data: {
          userId: record.reviewedById,
          type: "REVIEW_ACKNOWLEDGED",
          title: "Review Acknowledged",
          message: `${session.user.name} has acknowledged their performance review.`,
          link: "/dashboard/compliance",
        },
      });
    }

    return NextResponse.json({
      success: true,
      record: updatedRecord,
    });
  } catch (error) {
    console.error("Acknowledge review error:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge review" },
      { status: 500 }
    );
  }
}
