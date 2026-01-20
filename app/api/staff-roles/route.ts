import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staffRoles = await prisma.staffRole.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(staffRoles);
  } catch (error) {
    console.error("Get staff roles error:", error);
    return NextResponse.json(
      { error: "Failed to get staff roles" },
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, code, description, color } = await req.json();

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Validate code format (uppercase letters and underscores only)
    const codeRegex = /^[A-Z][A-Z_]*$/;
    if (!codeRegex.test(code)) {
      return NextResponse.json(
        { error: "Code must be uppercase letters and underscores only (e.g., FRONT_DESK)" },
        { status: 400 }
      );
    }

    // Check for duplicate code
    const existing = await prisma.staffRole.findUnique({
      where: {
        organizationId_code: {
          organizationId: session.user.organizationId,
          code,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A role with this code already exists" },
        { status: 400 }
      );
    }

    const staffRole = await prisma.staffRole.create({
      data: {
        name,
        code,
        description: description || null,
        color: color || "#6b7280",
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json(staffRole);
  } catch (error) {
    console.error("Create staff role error:", error);
    return NextResponse.json(
      { error: "Failed to create staff role" },
      { status: 500 }
    );
  }
}
