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

    // Only managers and admins can edit transactions
    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existingTransaction = await prisma.cashTransaction.findUnique({
      where: { id },
    });

    if (!existingTransaction || existingTransaction.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const { type, amount, notes, locationId } = body;

    const updateData: {
      type?: string;
      amount?: number;
      notes?: string | null;
      locationId?: string | null;
    } = {};

    if (type !== undefined) {
      const validTypes = ["TAKING", "BANKING", "PURCHASE", "ADJUSTMENT"];
      if (!validTypes.includes(type)) {
        return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
      }
      updateData.type = type;
    }

    if (amount !== undefined) {
      // Recalculate amount based on type
      const transactionType = type || existingTransaction.type;
      let finalAmount = Math.abs(amount);
      if (transactionType === "BANKING" || transactionType === "PURCHASE") {
        finalAmount = -finalAmount;
      } else if (transactionType === "ADJUSTMENT") {
        finalAmount = amount;
      }
      updateData.amount = finalAmount;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    if (locationId !== undefined) {
      updateData.locationId = locationId || null;
    }

    const updatedTransaction = await prisma.cashTransaction.update({
      where: { id },
      data: updateData,
      include: {
        loggedBy: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error("Update cash transaction error:", error);
    return NextResponse.json(
      { error: "Failed to update cash transaction" },
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

    // Only admins can delete transactions
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can delete transactions" }, { status: 403 });
    }

    const { id } = await params;

    const existingTransaction = await prisma.cashTransaction.findUnique({
      where: { id },
    });

    if (!existingTransaction || existingTransaction.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await prisma.cashTransaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete cash transaction error:", error);
    return NextResponse.json(
      { error: "Failed to delete cash transaction" },
      { status: 500 }
    );
  }
}
