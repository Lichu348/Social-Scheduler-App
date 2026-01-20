import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST assign a compliance item to a user (admin only)
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
    const { userId, issueDate, expiryDate, certificateNumber, proofUrl, notes } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get the compliance item
    const item = await prisma.complianceItem.findUnique({
      where: { id },
    });

    if (!item || item.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Compliance item not found" }, { status: 404 });
    }

    // Verify user exists in organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        locationAccess: {
          select: { locationId: true },
        },
      },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Managers can only assign to users at their locations
    if (session.user.role === "MANAGER") {
      const managerLocations = await prisma.locationStaff.findMany({
        where: { userId: session.user.id },
        select: { locationId: true },
      });
      const managerLocationIds = managerLocations.map((l) => l.locationId);
      const userLocationIds = user.locationAccess.map((l) => l.locationId);

      // Check if user shares at least one location with manager
      const hasSharedLocation = userLocationIds.some((id) =>
        managerLocationIds.includes(id)
      );

      if (!hasSharedLocation) {
        return NextResponse.json(
          { error: "You can only assign compliance to users at your locations" },
          { status: 403 }
        );
      }
    }

    // Calculate expiry if not provided
    const parsedIssueDate = issueDate ? new Date(issueDate) : new Date();
    let parsedExpiryDate: Date;

    if (expiryDate) {
      parsedExpiryDate = new Date(expiryDate);
    } else {
      parsedExpiryDate = new Date(parsedIssueDate);
      parsedExpiryDate.setMonth(parsedExpiryDate.getMonth() + item.validityMonths);
    }

    // Upsert the compliance record
    const record = await prisma.userCompliance.upsert({
      where: {
        userId_complianceItemId: {
          userId,
          complianceItemId: id,
        },
      },
      update: {
        issueDate: parsedIssueDate,
        expiryDate: parsedExpiryDate,
        certificateNumber: certificateNumber || null,
        proofUrl: proofUrl || null,
        notes: notes || null,
        status: "ACTIVE",
      },
      create: {
        userId,
        complianceItemId: id,
        issueDate: parsedIssueDate,
        expiryDate: parsedExpiryDate,
        certificateNumber: certificateNumber || null,
        proofUrl: proofUrl || null,
        notes: notes || null,
        status: "ACTIVE",
      },
      include: {
        complianceItem: {
          select: {
            name: true,
            type: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error("Assign compliance item error:", error);
    return NextResponse.json(
      { error: "Failed to assign compliance item" },
      { status: 500 }
    );
  }
}
