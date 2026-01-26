import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isManager = session.user.role === "MANAGER" || isAdmin;

    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existingRequest = await prisma.spendRequest.findUnique({
      where: { id },
      include: { requestedBy: true },
    });

    if (!existingRequest || existingRequest.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Handle approval/rejection (admin only)
    if (body.status && (body.status === "APPROVED" || body.status === "REJECTED")) {
      if (!isAdmin) {
        return NextResponse.json({ error: "Only admins can approve/reject requests" }, { status: 403 });
      }

      const updatedRequest = await prisma.spendRequest.update({
        where: { id },
        data: {
          status: body.status,
          reviewedAt: new Date(),
          reviewedById: session.user.id,
          reviewNotes: body.reviewNotes || null,
        },
        include: {
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
          reviewedBy: {
            select: { id: true, name: true },
          },
          location: {
            select: { id: true, name: true },
          },
        },
      });

      // Notify the requester
      await createNotification({
        userId: existingRequest.requestedById,
        type: body.status === "APPROVED" ? "SPEND_APPROVED" : "SPEND_REJECTED",
        title: body.status === "APPROVED" ? "Spend Request Approved" : "Spend Request Rejected",
        message: `Your spend request "${existingRequest.title}" has been ${body.status.toLowerCase()}${body.reviewNotes ? `: ${body.reviewNotes}` : ""}`,
        link: "/dashboard/spend",
      });

      return NextResponse.json(updatedRequest);
    }

    // Handle editing a pending request (owner only, while pending)
    if (existingRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only edit pending requests" },
        { status: 400 }
      );
    }

    if (existingRequest.requestedById !== session.user.id) {
      return NextResponse.json(
        { error: "Can only edit your own requests" },
        { status: 403 }
      );
    }

    const { title, description, justification, amount, category, locationId } = body;

    const updateData: {
      title?: string;
      description?: string | null;
      justification?: string;
      amount?: number;
      category?: string;
      locationId?: string | null;
    } = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description || null;
    if (justification !== undefined) updateData.justification = justification;
    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
      }
      updateData.amount = amount;
    }
    if (category !== undefined) {
      const validCategories = ["EQUIPMENT", "SUPPLIES", "MAINTENANCE", "MARKETING", "TRAINING", "OTHER"];
      if (!validCategories.includes(category)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      updateData.category = category;
    }
    if (locationId !== undefined) updateData.locationId = locationId || null;

    const updatedRequest = await prisma.spendRequest.update({
      where: { id },
      data: updateData,
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Update spend request error:", error);
    return NextResponse.json(
      { error: "Failed to update spend request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingRequest = await prisma.spendRequest.findUnique({
      where: { id },
    });

    if (!existingRequest || existingRequest.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only owner can delete, and only if pending
    if (existingRequest.requestedById !== session.user.id) {
      return NextResponse.json(
        { error: "Can only delete your own requests" },
        { status: 403 }
      );
    }

    if (existingRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only delete pending requests" },
        { status: 400 }
      );
    }

    await prisma.spendRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete spend request error:", error);
    return NextResponse.json(
      { error: "Failed to delete spend request" },
      { status: 500 }
    );
  }
}
