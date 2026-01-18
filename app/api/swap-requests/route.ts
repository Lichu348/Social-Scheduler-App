import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";

    const requests = await prisma.swapRequest.findMany({
      where: isManager
        ? { shift: { organizationId: session.user.organizationId } }
        : {
            OR: [
              { fromUserId: session.user.id },
              { toUserId: session.user.id },
            ],
          },
      include: {
        shift: {
          select: { id: true, title: true, startTime: true, endTime: true },
        },
        fromUser: {
          select: { id: true, name: true, email: true },
        },
        toUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Get swap requests error:", error);
    return NextResponse.json(
      { error: "Failed to get swap requests" },
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

    const { shiftId, type, toUserId, message } = await req.json();

    if (!shiftId || !type) {
      return NextResponse.json(
        { error: "Shift ID and type are required" },
        { status: 400 }
      );
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift || shift.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    if (shift.assignedToId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only request swaps for your own shifts" },
        { status: 403 }
      );
    }

    const request = await prisma.swapRequest.create({
      data: {
        shiftId,
        type,
        fromUserId: session.user.id,
        toUserId: toUserId || null,
        message: message || null,
      },
      include: {
        shift: {
          select: { id: true, title: true, startTime: true, endTime: true },
        },
        fromUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create notifications for managers
    const managers = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
        role: { in: ["MANAGER", "ADMIN"] },
      },
    });

    await prisma.notification.createMany({
      data: managers.map((manager) => ({
        userId: manager.id,
        type: type === "drop" ? "DROP_REQUEST" : "SWAP_REQUEST",
        title: type === "drop" ? "Shift Drop Request" : "Shift Swap Request",
        message: `${session.user.name} requested to ${type} their shift "${shift.title}"`,
        link: "/dashboard/swaps",
      })),
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error("Create swap request error:", error);
    return NextResponse.json(
      { error: "Failed to create swap request" },
      { status: 500 }
    );
  }
}
