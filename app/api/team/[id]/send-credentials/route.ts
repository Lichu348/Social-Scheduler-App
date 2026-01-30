import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { sendEmail, welcomeCredentialsEmail } from "@/lib/email";

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

    // Only admins can send credentials
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Get the user to send credentials to
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, organizationId: true },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Can't send to yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot send credentials to yourself." },
        { status: 400 }
      );
    }

    // Get organization name for email
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { name: true },
    });

    // Generate a new temporary password
    const tempPassword = generateTempPassword();
    const hashedPassword = await hash(tempPassword, 12);

    // Update the user's password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Create a notification for the user
    await createNotification({
      userId: id,
      type: "CREDENTIALS_SENT",
      title: "Login Credentials Sent",
      message: "Your login credentials have been sent to your email. Please check your inbox and change your password after logging in.",
      link: "/dashboard/settings",
    });

    // Send the welcome email with credentials
    const loginUrl = `${process.env.NEXTAUTH_URL || "https://app.example.com"}/login`;
    const emailContent = welcomeCredentialsEmail({
      employeeName: user.name,
      email: user.email,
      tempPassword,
      loginUrl,
      organizationName: organization?.name || "Your Organization",
    });

    const result = await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Login credentials sent to ${user.email}`,
    });
  } catch (error) {
    console.error("Send credentials error:", error);
    return NextResponse.json(
      { error: "Failed to send credentials" },
      { status: 500 }
    );
  }
}
