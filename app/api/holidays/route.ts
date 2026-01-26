import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotifications } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";

    const requests = await prisma.holidayRequest.findMany({
      where: isManager
        ? { user: { organizationId: session.user.organizationId } }
        : { userId: session.user.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, holidayBalance: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Get holidays error:", error);
    return NextResponse.json(
      { error: "Failed to get holiday requests" },
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

    const { startDate, endDate, hours, reason } = await req.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 }
      );
    }

    if (!hours || hours <= 0) {
      return NextResponse.json(
        { error: "Hours must be greater than 0" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check holiday balance
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.holidayBalance < hours) {
      return NextResponse.json(
        { error: "Insufficient holiday balance" },
        { status: 400 }
      );
    }

    const request = await prisma.holidayRequest.create({
      data: {
        userId: session.user.id,
        startDate: start,
        endDate: end,
        hours,
        reason: reason || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify managers
    const managers = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
        role: { in: ["MANAGER", "ADMIN"] },
      },
    });

    await createNotifications(
      managers.map((manager) => ({
        userId: manager.id,
        type: "HOLIDAY_REQUEST",
        title: "Holiday Request",
        message: `${session.user.name} requested ${hours} hours off`,
        link: "/dashboard/holidays",
      }))
    );

    return NextResponse.json(request);
  } catch (error) {
    console.error("Create holiday request error:", error);
    return NextResponse.json(
      { error: "Failed to create holiday request" },
      { status: 500 }
    );
  }
}
