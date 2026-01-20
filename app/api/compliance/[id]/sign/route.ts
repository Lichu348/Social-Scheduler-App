import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST sign/acknowledge a compliance item
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { signature, certificateNumber, proofUrl, notes } = body;

    if (!signature) {
      return NextResponse.json(
        { error: "Signature is required" },
        { status: 400 }
      );
    }

    // Get the compliance item
    const item = await prisma.complianceItem.findUnique({
      where: { id },
    });

    if (!item || item.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!item.isActive) {
      return NextResponse.json(
        { error: "This compliance item is no longer active" },
        { status: 400 }
      );
    }

    // Calculate expiry date
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + item.validityMonths);

    // Upsert the compliance record
    const record = await prisma.userCompliance.upsert({
      where: {
        userId_complianceItemId: {
          userId: session.user.id,
          complianceItemId: id,
        },
      },
      update: {
        issueDate: now,
        expiryDate,
        signature: signature.trim(),
        signedAt: now,
        certificateNumber: certificateNumber || null,
        proofUrl: proofUrl || null,
        notes: notes || null,
        status: "ACTIVE",
      },
      create: {
        userId: session.user.id,
        complianceItemId: id,
        issueDate: now,
        expiryDate,
        signature: signature.trim(),
        signedAt: now,
        certificateNumber: certificateNumber || null,
        proofUrl: proofUrl || null,
        notes: notes || null,
        status: "ACTIVE",
      },
      include: {
        complianceItem: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      record: {
        id: record.id,
        signedAt: record.signedAt,
        expiryDate: record.expiryDate,
        itemName: record.complianceItem.name,
        itemType: record.complianceItem.type,
      },
    });
  } catch (error) {
    console.error("Sign compliance item error:", error);
    return NextResponse.json(
      { error: "Failed to sign compliance item" },
      { status: 500 }
    );
  }
}
