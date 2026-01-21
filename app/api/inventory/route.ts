import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  staffRole?: string;
  organizationId: string;
}

// GET all inventory items
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;
    const isManager = user.role === "MANAGER" || user.role === "ADMIN";

    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const category = searchParams.get("category");
    const lowStock = searchParams.get("lowStock") === "true";

    const items = await prisma.inventoryItem.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
        ...(locationId && { locationId }),
        ...(category && { category }),
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Filter low stock items if requested
    const result = lowStock
      ? items.filter((item) => item.currentStock <= item.minimumStock)
      : items;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get inventory error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

// POST create new inventory item
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;
    const isManager = user.role === "MANAGER" || user.role === "ADMIN";

    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      category,
      unit,
      currentStock,
      minimumStock,
      reorderAmount,
      notes,
      locationId,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        category: category || "CLEANING",
        unit: unit || "units",
        currentStock: currentStock || 0,
        minimumStock: minimumStock || 5,
        reorderAmount: reorderAmount || 10,
        notes: notes || null,
        locationId: locationId || null,
        organizationId: user.organizationId,
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Create inventory error:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 }
    );
  }
}
