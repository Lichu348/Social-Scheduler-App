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

// GET single inventory item with logs
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
        stockLogs: {
          include: {
            loggedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Get inventory item error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}

// PATCH update inventory item or adjust stock
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await req.json();

    // Verify item exists and belongs to org
    const existing = await prisma.inventoryItem.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const {
      name,
      category,
      unit,
      minimumStock,
      reorderAmount,
      notes,
      locationId,
      isActive,
      // Stock adjustment fields
      adjustStock,
      adjustQuantity,
      adjustType,
      adjustNotes,
    } = body;

    // Handle stock adjustment
    if (adjustStock && adjustQuantity !== undefined && adjustType) {
      const quantity = adjustType === "REMOVE" ? -Math.abs(adjustQuantity) : Math.abs(adjustQuantity);
      const newStock = Math.max(0, existing.currentStock + quantity);

      // Create log entry
      await prisma.inventoryLog.create({
        data: {
          itemId: id,
          changeType: adjustType,
          quantity: quantity,
          previousStock: existing.currentStock,
          newStock: newStock,
          notes: adjustNotes || null,
          loggedById: user.id,
          organizationId: user.organizationId,
        },
      });

      // Update stock
      const item = await prisma.inventoryItem.update({
        where: { id },
        data: { currentStock: newStock },
        include: {
          location: {
            select: { id: true, name: true },
          },
        },
      });

      return NextResponse.json(item);
    }

    // Regular update
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(unit !== undefined && { unit }),
        ...(minimumStock !== undefined && { minimumStock }),
        ...(reorderAmount !== undefined && { reorderAmount }),
        ...(notes !== undefined && { notes }),
        ...(locationId !== undefined && { locationId: locationId || null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Update inventory item error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

// DELETE inventory item
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify item exists and belongs to org
    const existing = await prisma.inventoryItem.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.inventoryItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete inventory item error:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
