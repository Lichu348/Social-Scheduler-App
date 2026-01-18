import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const categories = await prisma.shiftCategory.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Get shift categories error:", error);
    return NextResponse.json(
      { error: "Failed to get shift categories" },
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

    // Only managers and admins can create categories
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, hourlyRate, color } = await req.json();

    if (!name || hourlyRate === undefined) {
      return NextResponse.json(
        { error: "Name and hourly rate are required" },
        { status: 400 }
      );
    }

    if (hourlyRate < 0) {
      return NextResponse.json(
        { error: "Hourly rate must be positive" },
        { status: 400 }
      );
    }

    const category = await prisma.shiftCategory.create({
      data: {
        name,
        hourlyRate: parseFloat(hourlyRate),
        color: color || "#3b82f6",
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Create shift category error:", error);
    return NextResponse.json(
      { error: "Failed to create shift category" },
      { status: 500 }
    );
  }
}
