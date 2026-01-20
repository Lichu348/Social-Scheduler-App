import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user to check permissions and get org
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, organizationId: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Session expired. Please log out and log back in." }, { status: 404 });
    }

    // Only admins and managers can invite staff
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Only admins and managers can invite staff" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, role, staffRole, primaryLocationId } = body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email || email.trim().length === 0) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Managers can only invite employees, not other managers or admins
    const userRole = role || "EMPLOYEE";
    if (currentUser.role === "MANAGER" && userRole !== "EMPLOYEE") {
      return NextResponse.json(
        { error: "Managers can only invite employees" },
        { status: 403 }
      );
    }

    // Generate a temporary password
    const tempPassword = generateTempPassword();
    const hashedPassword = await hash(tempPassword, 12);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: userRole,
        staffRole: staffRole || "DESK",
        organizationId: currentUser.organizationId,
        primaryLocationId: primaryLocationId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffRole: true,
      },
    });

    // If primary location is set, also add to LocationStaff
    if (primaryLocationId) {
      await prisma.locationStaff.create({
        data: {
          userId: newUser.id,
          locationId: primaryLocationId,
        },
      });
    }

    return NextResponse.json({
      message: "Staff member invited successfully",
      user: newUser,
      tempPassword, // Return temp password so admin can share it
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: "Failed to invite staff member" },
      { status: 500 }
    );
  }
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
