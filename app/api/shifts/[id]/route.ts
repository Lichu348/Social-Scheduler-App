import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkUserCertifications, formatCertificationError } from "@/lib/certification-utils";
import { sendEmail, newShiftAssignedEmail } from "@/lib/email";

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

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true, hourlyRate: true, color: true },
        },
      },
    });

    if (!shift || shift.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    return NextResponse.json(shift);
  } catch (error) {
    console.error("Get shift error:", error);
    return NextResponse.json(
      { error: "Failed to get shift" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const data = await req.json();

    const shift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!shift || shift.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    // Check certifications if assigning to a new user
    if (data.assignedToId && data.assignedToId !== shift.assignedToId) {
      const certCheck = await checkUserCertifications(data.assignedToId, session.user.organizationId);
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
    }

    // Track if this is a new assignment
    const isNewAssignment = data.assignedToId && data.assignedToId !== shift.assignedToId;

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        assignedToId: data.assignedToId !== undefined ? data.assignedToId : undefined,
        isOpen: data.assignedToId === null || data.assignedToId === "",
        status: data.status,
        categoryId: data.categoryId !== undefined ? data.categoryId : undefined,
        locationId: data.locationId !== undefined ? data.locationId : undefined,
        scheduledBreakMinutes: data.scheduledBreakMinutes !== undefined ? data.scheduledBreakMinutes : undefined,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true, hourlyRate: true, color: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    // Send email notification for new shift assignment
    if (isNewAssignment && updatedShift.assignedTo?.email) {
      const org = await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true },
      });

      const shiftDate = new Date(updatedShift.startTime);
      const endDate = new Date(updatedShift.endTime);

      const formattedDate = shiftDate.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const formattedTime = `${shiftDate.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })} - ${endDate.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;

      const emailContent = newShiftAssignedEmail({
        employeeName: updatedShift.assignedTo.name || "Team Member",
        shiftTitle: updatedShift.title,
        shiftDate: formattedDate,
        shiftTime: formattedTime,
        locationName: updatedShift.location?.name,
        organizationName: org?.name || "Your Organization",
      });

      // Send email in background (don't wait for it)
      sendEmail({
        to: updatedShift.assignedTo.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }).catch((err) => console.error("Failed to send shift assignment email:", err));
    }

    return NextResponse.json(updatedShift);
  } catch (error) {
    console.error("Update shift error:", error);
    return NextResponse.json(
      { error: "Failed to update shift" },
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

    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const shift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!shift || shift.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    await prisma.shift.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete shift error:", error);
    return NextResponse.json(
      { error: "Failed to delete shift" },
      { status: 500 }
    );
  }
}
