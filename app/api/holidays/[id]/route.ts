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
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await req.json();

    const request = await prisma.holidayRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request || request.user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const updatedRequest = await prisma.holidayRequest.update({
      where: { id },
      data: { status },
    });

    // If approved, deduct from holiday balance
    if (status === "APPROVED") {
      await prisma.user.update({
        where: { id: request.userId },
        data: {
          holidayBalance: { decrement: request.hours },
        },
      });
    }

    // Notify the user
    await prisma.notification.create({
      data: {
        userId: request.userId,
        type: status === "APPROVED" ? "HOLIDAY_APPROVED" : "HOLIDAY_REJECTED",
        title: status === "APPROVED" ? "Holiday Approved" : "Holiday Rejected",
        message: `Your holiday request has been ${status.toLowerCase()}`,
        link: "/dashboard/holidays",
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Update holiday request error:", error);
    return NextResponse.json(
      { error: "Failed to update holiday request" },
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

    const request = await prisma.holidayRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only the requester or managers can delete
    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
    if (request.userId !== session.user.id && !isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.holidayRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete holiday request error:", error);
    return NextResponse.json(
      { error: "Failed to delete holiday request" },
      { status: 500 }
    );
  }
}
