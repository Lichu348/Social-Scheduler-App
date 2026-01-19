import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Get certifications for a user (or all users if admin)
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // If not admin/manager, can only view own certifications
    if (session.user.role === "EMPLOYEE" && userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where = userId
      ? { userId, user: { organizationId: session.user.organizationId } }
      : { user: { organizationId: session.user.organizationId } };

    const certifications = await prisma.userCertification.findMany({
      where,
      include: {
        certificationType: true,
        user: {
          select: { id: true, name: true, email: true, staffRole: true },
        },
      },
      orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
    });

    // Mark expired certifications
    const now = new Date();
    const certsWithStatus = certifications.map((cert) => ({
      ...cert,
      isExpired: cert.expiryDate ? cert.expiryDate < now : false,
      isExpiringSoon: cert.expiryDate
        ? cert.expiryDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && cert.expiryDate >= now
        : false,
    }));

    return NextResponse.json(certsWithStatus);
  } catch (error) {
    console.error("Get user certifications error:", error);
    return NextResponse.json(
      { error: "Failed to get certifications" },
      { status: 500 }
    );
  }
}

// Add a certification to a user
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and managers can add certifications
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, certificationTypeId, issueDate, expiryDate, certificateNumber, notes } = await req.json();

    if (!userId || !certificationTypeId || !issueDate) {
      return NextResponse.json(
        { error: "User ID, certification type, and issue date are required" },
        { status: 400 }
      );
    }

    // Verify user belongs to same org
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify certification type belongs to same org
    const certType = await prisma.certificationType.findUnique({
      where: { id: certificationTypeId },
    });

    if (!certType || certType.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Certification type not found" }, { status: 404 });
    }

    const certification = await prisma.userCertification.create({
      data: {
        userId,
        certificationTypeId,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        certificateNumber: certificateNumber || null,
        notes: notes || null,
      },
      include: {
        certificationType: true,
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(certification);
  } catch (error) {
    console.error("Add user certification error:", error);
    return NextResponse.json(
      { error: "Failed to add certification" },
      { status: 500 }
    );
  }
}

// Update or revoke a certification
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, expiryDate, certificateNumber, notes, status } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Certification ID is required" }, { status: 400 });
    }

    const cert = await prisma.userCertification.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!cert || cert.user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Certification not found" }, { status: 404 });
    }

    const updated = await prisma.userCertification.update({
      where: { id },
      data: {
        expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined,
        certificateNumber: certificateNumber !== undefined ? certificateNumber : undefined,
        notes: notes !== undefined ? notes : undefined,
        status: status !== undefined ? status : undefined,
      },
      include: {
        certificationType: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update user certification error:", error);
    return NextResponse.json(
      { error: "Failed to update certification" },
      { status: 500 }
    );
  }
}

// Delete a certification
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Certification ID is required" }, { status: 400 });
    }

    const cert = await prisma.userCertification.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!cert || cert.user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Certification not found" }, { status: 404 });
    }

    await prisma.userCertification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user certification error:", error);
    return NextResponse.json(
      { error: "Failed to delete certification" },
      { status: 500 }
    );
  }
}
