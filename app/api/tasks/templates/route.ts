import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET all task templates
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const templates = await prisma.taskTemplate.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(activeOnly && { isActive: true }),
        ...(locationId && { OR: [{ locationId }, { locationId: null }] }),
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { dayOfWeek: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST create task template
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

    const body = await req.json();
    const { name, description, dayOfWeek, category, priority, locationId, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const template = await prisma.taskTemplate.create({
      data: {
        name,
        description: description || null,
        dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : null,
        category: category || "GENERAL",
        priority: priority || 1,
        locationId: locationId || null,
        sortOrder: sortOrder || 0,
        organizationId: session.user.organizationId,
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
