import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkUserCertifications, formatCertificationError } from "@/lib/certification-utils";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const shift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!shift || shift.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    if (!shift.isOpen) {
      return NextResponse.json(
        { error: "Shift is not available for pickup" },
        { status: 400 }
      );
    }

    // Check certifications before allowing pickup
    const certCheck = await checkUserCertifications(session.user.id, session.user.organizationId);
    if (!certCheck.isValid) {
      return NextResponse.json(
        {
          error: "Certification requirements not met",
          certificationError: formatCertificationError(certCheck),
          missingCertifications: certCheck.missingCertifications,
          expiredCertifications: certCheck.expiredCertifications,
        },
        { status: 400 }
      );
    }

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: {
        assignedToId: session.user.id,
        isOpen: false,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create notification for managers
    const managers = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
        role: { in: ["MANAGER", "ADMIN"] },
      },
    });

    await prisma.notification.createMany({
      data: managers.map((manager) => ({
        userId: manager.id,
        type: "SHIFT_PICKUP",
        title: "Shift Picked Up",
        message: `${session.user.name} picked up the shift "${shift.title}"`,
        link: "/dashboard/schedule",
      })),
    });

    return NextResponse.json(updatedShift);
  } catch (error) {
    console.error("Pickup shift error:", error);
    return NextResponse.json(
      { error: "Failed to pickup shift" },
      { status: 500 }
    );
  }
}
