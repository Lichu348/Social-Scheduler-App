import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { createUserSchema } from "@/lib/schemas";
import { ValidationError } from "@/lib/errors";
import { handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffRole: true,
        paymentType: true,
        monthlySalary: true,
        phone: true,
        holidayBalance: true,
        createdAt: true,
        primaryLocation: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Get team error:", error);
    return NextResponse.json(
      { error: "Failed to get team" },
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

    // Only admins and managers can add users
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }

    const { name, password, role, staffRole, primaryLocationId } = result.data;
    const email = result.data.email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "EMPLOYEE",
        staffRole: staffRole || "DESK",
        primaryLocationId: primaryLocationId || null,
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffRole: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}
