import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const month = searchParams.get("month"); // Format: YYYY-MM
    const locationId = searchParams.get("locationId");

    // Build where clause
    const where: {
      organizationId: string;
      status?: string;
      locationId?: string;
      requestedById?: string;
      createdAt?: { gte: Date; lt: Date };
    } = {
      organizationId: session.user.organizationId,
    };

    // Managers can only see their own requests, admins see all
    if (!isAdmin) {
      where.requestedById = session.user.id;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (month) {
      const [year, monthNum] = month.split("-").map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 1);
      where.createdAt = { gte: startDate, lt: endDate };
    }

    const requests = await prisma.spendRequest.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Get spend requests error:", error);
    return NextResponse.json(
      { error: "Failed to get spend requests" },
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

    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, justification, amount, category, locationId } = await req.json();

    if (!title || !justification || !amount || !category) {
      return NextResponse.json(
        { error: "Title, justification, amount, and category are required" },
        { status: 400 }
      );
    }

    const validCategories = ["EQUIPMENT", "SUPPLIES", "MAINTENANCE", "MARKETING", "TRAINING", "OTHER"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    const request = await prisma.spendRequest.create({
      data: {
        title,
        description: description || null,
        justification,
        amount,
        category,
        locationId: locationId || null,
        requestedById: session.user.id,
        organizationId: session.user.organizationId,
      },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    // Notify admins about new spend request
    const admins = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
        role: "ADMIN",
      },
    });

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "SPEND_REQUEST",
        title: "New Spend Request",
        message: `${session.user.name} requested £${amount.toFixed(2)} for ${title}`,
        link: "/dashboard/spend",
      })),
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error("Create spend request error:", error);
    return NextResponse.json(
      { error: "Failed to create spend request" },
      { status: 500 }
    );
  }
}
