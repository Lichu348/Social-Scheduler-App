import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { name, email, password, organizationName } = await req.json();

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create organization and user
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        users: {
          create: {
            name,
            email,
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
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
