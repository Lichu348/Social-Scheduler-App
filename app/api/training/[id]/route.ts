import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    const document = await prisma.trainingDocument.findUnique({
      where: { id },
      include: {
        signoffs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { signedAt: "desc" },
        },
      },
    });

    if (!document || document.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Get training document error:", error);
    return NextResponse.json(
      { error: "Failed to get training document" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update training documents
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const data = await req.json();

    const document = await prisma.trainingDocument.findUnique({
      where: { id },
    });

    if (!document || document.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updatedDocument = await prisma.trainingDocument.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        validityMonths: data.validityMonths,
        isRequired: data.isRequired,
        requiredForRoles: data.requiredForRoles !== undefined
          ? JSON.stringify(data.requiredForRoles)
          : undefined,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error("Update training document error:", error);
    return NextResponse.json(
      { error: "Failed to update training document" },
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

    // Only admins can delete training documents
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const document = await prisma.trainingDocument.findUnique({
      where: { id },
    });

    if (!document || document.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete all signoffs first (due to foreign key constraint)
    await prisma.trainingSignoff.deleteMany({
      where: { documentId: id },
    });

    // Delete the document
    await prisma.trainingDocument.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete training document error:", error);
    return NextResponse.json(
      { error: "Failed to delete training document" },
      { status: 500 }
    );
  }
}
