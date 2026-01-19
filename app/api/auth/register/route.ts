import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { name, email, password, organizationName } = await req.json();

    // Validate required fields with specific messages
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    if (!email || email.trim().length === 0) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (!organizationName || organizationName.trim().length === 0) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create organization and user
    const organization = await prisma.organization.create({
      data: {
        name: organizationName.trim(),
        users: {
          create: {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: "ADMIN", // First user is admin
          },
        },
      },
      include: {
        users: true,
      },
    });

    return NextResponse.json({
      message: "Registration successful",
      user: {
        id: organization.users[0].id,
        name: organization.users[0].name,
        email: organization.users[0].email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Get detailed error info
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "Unknown";
    console.error("Error details:", { name: errorName, message: errorMessage });

    // Check for specific Prisma errors
    if (error instanceof Error) {
      if (errorMessage.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 }
        );
      }
      if (errorMessage.includes("connect") || errorMessage.includes("ECONNREFUSED")) {
        return NextResponse.json(
          { error: "Unable to connect to database. Please try again later." },
          { status: 503 }
        );
      }
      if (errorMessage.includes("prepared statement") || errorMessage.includes("pgbouncer")) {
        return NextResponse.json(
          { error: "Database connection error. Please try again." },
          { status: 503 }
        );
      }
    }

    // Return the actual error message in development/for debugging
    return NextResponse.json(
      { error: `Registration failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
