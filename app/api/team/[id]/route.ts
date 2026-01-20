import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can change roles
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { role, staffRole, holidayBalance, phone, primaryLocationId } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: role !== undefined ? role : undefined,
        staffRole: staffRole !== undefined ? staffRole : undefined,
        holidayBalance: holidayBalance !== undefined ? holidayBalance : undefined,
        phone: phone !== undefined ? phone : undefined,
        primaryLocationId: primaryLocationId !== undefined ? primaryLocationId : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffRole: true,
        holidayBalance: true,
        phone: true,
        primaryLocation: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
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

    // Only admins can remove users
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Can't remove yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete all related records in a transaction
    await prisma.$transaction(async (tx) => {
      // Unassign from shifts (don't delete the shifts, just unassign)
      await tx.shift.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null, isOpen: true },
      });

      // Clear createdBy reference on shifts
      await tx.shift.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      });

      // Delete related records
      await tx.holidayRequest.deleteMany({ where: { userId: id } });
      await tx.locationStaff.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.staffAvailability.deleteMany({ where: { userId: id } });
      await tx.timeEntry.deleteMany({ where: { userId: id } });
      await tx.userCertification.deleteMany({ where: { userId: id } });
      await tx.userCategoryRate.deleteMany({ where: { userId: id } });
      await tx.userCompliance.deleteMany({ where: { userId: id } });

      // Handle swap requests
      await tx.swapRequest.deleteMany({
        where: { OR: [{ fromUserId: id }, { toUserId: id }] },
      });

      // Handle messages
      await tx.messageRead.deleteMany({ where: { userId: id } });
      await tx.message.deleteMany({
        where: { OR: [{ senderId: id }, { receiverId: id }] },
      });

      // Handle training signoffs (if table exists)
      try {
        await tx.trainingSignoff.deleteMany({ where: { userId: id } });
      } catch {
        // Table might not exist
      }

      // Finally delete the user
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user. They may have records that cannot be removed." },
      { status: 500 }
    );
  }
}
