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

    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";

    const { id } = await params;
    const { status } = await req.json();

    const request = await prisma.swapRequest.findUnique({
      where: { id },
      include: {
        shift: true,
        fromUser: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only managers can approve/reject, or the toUser can accept a swap
    if (!isManager && request.toUserId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedRequest = await prisma.swapRequest.update({
      where: { id },
      data: { status },
    });

    // If approved, update the shift
    if (status === "APPROVED") {
      if (request.type === "drop") {
        // Make the shift open
        await prisma.shift.update({
          where: { id: request.shiftId },
          data: {
            assignedToId: null,
            isOpen: true,
          },
        });
      } else if (request.type === "swap" && request.toUserId) {
        // Swap the assignment
        await prisma.shift.update({
          where: { id: request.shiftId },
          data: {
            assignedToId: request.toUserId,
          },
        });
      }

      // Notify the requester
      await prisma.notification.create({
        data: {
          userId: request.fromUserId,
          type: "REQUEST_APPROVED",
          title: "Request Approved",
          message: `Your ${request.type} request for "${request.shift.title}" has been approved`,
          link: "/dashboard/schedule",
        },
      });
    } else if (status === "REJECTED") {
      // Notify the requester
      await prisma.notification.create({
        data: {
          userId: request.fromUserId,
          type: "REQUEST_REJECTED",
          title: "Request Rejected",
          message: `Your ${request.type} request for "${request.shift.title}" has been rejected`,
          link: "/dashboard/swaps",
        },
      });
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Update swap request error:", error);
    return NextResponse.json(
      { error: "Failed to update swap request" },
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

    const request = await prisma.swapRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only the requester or managers can cancel
    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
    if (request.fromUserId !== session.user.id && !isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.swapRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete swap request error:", error);
    return NextResponse.json(
      { error: "Failed to delete swap request" },
      { status: 500 }
    );
  }
}
