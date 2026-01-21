import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  staffRole: string;
  organizationId: string;
  organizationName: string;
}

// GET all check types for organization
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    // Only managers and admins can view maintenance
    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const checkTypes = await prisma.maintenanceCheckType.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            logs: true,
          },
        },
      },
    });

    return NextResponse.json(checkTypes);
  } catch (error) {
    console.error("Get check types error:", error);
    return NextResponse.json(
      { error: "Failed to fetch check types" },
      { status: 500 }
    );
  }
}

// POST create new check type (managers and admins)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, frequencyDays, isActive, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const checkType = await prisma.maintenanceCheckType.create({
      data: {
        name,
        description: description || null,
        frequencyDays: frequencyDays || 1,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
        organizationId: user.organizationId,
      },
    });

    return NextResponse.json(checkType, { status: 201 });
  } catch (error) {
    console.error("Create check type error:", error);
    return NextResponse.json(
      { error: "Failed to create check type" },
      { status: 500 }
    );
  }
}
