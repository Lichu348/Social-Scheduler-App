import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Get all certification types for the organization
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const certificationTypes = await prisma.certificationType.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        _count: {
          select: { userCertifications: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(certificationTypes);
  } catch (error) {
    console.error("Get certification types error:", error);
    return NextResponse.json(
      { error: "Failed to get certification types" },
      { status: 500 }
    );
  }
}

// Create a new certification type
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, description, validityMonths, isRequired, requiredForRoles } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Certification name is required" },
        { status: 400 }
      );
    }

    const certificationType = await prisma.certificationType.create({
      data: {
        name,
        description: description || null,
        validityMonths: validityMonths ?? 12,
        isRequired: isRequired ?? false,
        requiredForRoles: requiredForRoles ? JSON.stringify(requiredForRoles) : "[]",
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json(certificationType);
  } catch (error) {
    console.error("Create certification type error:", error);
    return NextResponse.json(
      { error: "Failed to create certification type" },
      { status: 500 }
    );
  }
}
