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

    // Get all training documents for the organization
    const documents = await prisma.trainingDocument.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: {
        signoffs: {
          where: {
            userId: session.user.id,
          },
          select: {
            id: true,
            signedAt: true,
            expiresAt: true,
            signature: true,
          },
        },
        _count: {
          select: {
            signoffs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get user's staff role to filter by required roles
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { staffRole: true },
    });

    // Transform to include signoff status
    const now = new Date();
    const documentsWithStatus = documents.map((doc) => {
      const userSignoff = doc.signoffs[0];
      const requiredRoles: string[] = JSON.parse(doc.requiredForRoles || "[]");
      const isRequiredForUser = requiredRoles.length === 0 || requiredRoles.includes(user?.staffRole || "");

      let signoffStatus: "not_signed" | "signed" | "expired" = "not_signed";
      if (userSignoff) {
        signoffStatus = userSignoff.expiresAt < now ? "expired" : "signed";
      }

      return {
        ...doc,
        userSignoff: userSignoff || null,
        signoffStatus,
        isRequiredForUser,
        totalSignoffs: doc._count.signoffs,
      };
    });

    return NextResponse.json(documentsWithStatus);
  } catch (error) {
    console.error("Get training documents error:", error);
    return NextResponse.json(
      { error: "Failed to get training documents" },
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

    // Only admins can create training documents
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, fileUrl, fileName, validityMonths, isRequired, requiredForRoles } = await req.json();

    if (!title || !fileUrl || !fileName) {
      return NextResponse.json(
        { error: "Title, file URL, and file name are required" },
        { status: 400 }
      );
    }

    const document = await prisma.trainingDocument.create({
      data: {
        title,
        description: description || null,
        fileUrl,
        fileName,
        validityMonths: validityMonths || 12,
        isRequired: isRequired || false,
        requiredForRoles: JSON.stringify(requiredForRoles || []),
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Create training document error:", error);
    return NextResponse.json(
      { error: "Failed to create training document" },
      { status: 500 }
    );
  }
}
