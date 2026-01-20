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

    const templates = await prisma.shiftTemplate.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
            color: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Get shift templates error:", error);
    return NextResponse.json(
      { error: "Failed to get shift templates" },
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

    // Only managers and admins can create templates
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { name, startTime, endTime, categoryId, defaultTitle, description } =
      await req.json();

    if (!name || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Name, start time, and end time are required" },
        { status: 400 }
      );
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:mm format" },
        { status: 400 }
      );
    }

    // If categoryId provided, verify it belongs to the organization
    if (categoryId) {
      const category = await prisma.shiftCategory.findFirst({
        where: {
          id: categoryId,
          organizationId: session.user.organizationId,
        },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
    }

    const template = await prisma.shiftTemplate.create({
      data: {
        name,
        startTime,
        endTime,
        defaultTitle: defaultTitle || null,
        description: description || null,
        categoryId: categoryId || null,
        organizationId: session.user.organizationId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Create shift template error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create shift template: ${message}` },
      { status: 500 }
    );
  }
}
