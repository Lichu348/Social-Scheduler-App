import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Generate a random temporary password
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can reset passwords
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Get the user to reset password for
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, organizationId: true },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Can't reset your own password this way - use settings page instead
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot reset your own password. Use the settings page instead." },
        { status: 400 }
      );
    }

    // Generate a new temporary password
    const tempPassword = generateTempPassword();
    const hashedPassword = await hash(tempPassword, 12);

    // Update the user's password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Create a notification for the user
    await prisma.notification.create({
      data: {
        userId: id,
        type: "PASSWORD_RESET",
        title: "Password Reset",
        message: "Your password has been reset by an administrator. Please use the temporary password provided and change it after logging in.",
        link: "/dashboard/settings",
      },
    });

    return NextResponse.json({
      success: true,
      tempPassword,
      message: `Password reset for ${user.name}. Share this temporary password securely.`,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
