import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
    const { signature } = await req.json();

    if (!signature) {
      return NextResponse.json(
        { error: "Signature is required" },
        { status: 400 }
      );
    }

    // Get the training document
    const document = await prisma.trainingDocument.findUnique({
      where: { id },
    });

    if (!document || document.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!document.isActive) {
      return NextResponse.json(
        { error: "This document is no longer active" },
        { status: 400 }
      );
    }

    // Calculate expiry date based on validity months
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + document.validityMonths);

    // Upsert the signoff (replace existing if exists)
    const signoff = await prisma.trainingSignoff.upsert({
      where: {
        userId_documentId: {
          userId: session.user.id,
          documentId: id,
        },
      },
      update: {
        signedAt: now,
        expiresAt,
        signature,
      },
      create: {
        userId: session.user.id,
        documentId: id,
        signedAt: now,
        expiresAt,
        signature,
      },
      include: {
        document: {
          select: {
            title: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      signoff: {
        id: signoff.id,
        signedAt: signoff.signedAt,
        expiresAt: signoff.expiresAt,
        documentTitle: signoff.document.title,
      },
    });
  } catch (error) {
    console.error("Sign training document error:", error);
    return NextResponse.json(
      { error: "Failed to sign training document" },
      { status: 500 }
    );
  }
}
