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

    const signoff = await prisma.settingSignoff.findUnique({
      where: { id },
      include: {
        signedOffBy: {
          select: { id: true, name: true, email: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    if (!signoff || signoff.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Sign-off not found" }, { status: 404 });
    }

    return NextResponse.json(signoff);
  } catch (error) {
    console.error("Get setting signoff error:", error);
    return NextResponse.json(
      { error: "Failed to get setting signoff" },
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

    // Only admins can delete signoffs
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can delete sign-offs" }, { status: 403 });
    }

    const { id } = await params;

    const signoff = await prisma.settingSignoff.findUnique({
      where: { id },
    });

    if (!signoff || signoff.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Sign-off not found" }, { status: 404 });
    }

    await prisma.settingSignoff.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete setting signoff error:", error);
    return NextResponse.json(
      { error: "Failed to delete setting signoff" },
      { status: 500 }
    );
  }
}
