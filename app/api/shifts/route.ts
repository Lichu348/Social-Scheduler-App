import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkUserCertifications, formatCertificationError } from "@/lib/certification-utils";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const shifts = await prisma.shift.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(startDate && endDate
          ? {
              startTime: { gte: new Date(startDate) },
              endTime: { lte: new Date(endDate) },
            }
          : {}),
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true, hourlyRate: true, color: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(shifts);
  } catch (error) {
    console.error("Get shifts error:", error);
    return NextResponse.json(
      { error: "Failed to get shifts" },
      { status: 500 }
    );
  }
}

interface BreakRule {
  minHours: number;
  breakMinutes: number;
}

function calculateScheduledBreak(startTime: Date, endTime: Date, breakRulesJson: string): number {
  try {
    const breakRules: BreakRule[] = JSON.parse(breakRulesJson);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Find applicable break rule (use the one with highest minHours that's <= duration)
    const applicableRule = breakRules
      .filter((r) => durationHours >= r.minHours)
      .sort((a, b) => b.minHours - a.minHours)[0];

    return applicableRule?.breakMinutes || 0;
  } catch {
    return 0;
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can create shifts
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, startTime, endTime, assignedToId, categoryId, locationId } = await req.json();

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, start time, and end time are required" },
        { status: 400 }
      );
    }

    // Check certifications if assigning to a user
    if (assignedToId) {
      const certCheck = await checkUserCertifications(assignedToId, session.user.organizationId);
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

    // Get organization break rules
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { breakRules: true },
    });

    const shiftStartTime = new Date(startTime);
    const shiftEndTime = new Date(endTime);
    const scheduledBreakMinutes = calculateScheduledBreak(
      shiftStartTime,
      shiftEndTime,
      organization?.breakRules || "[]"
    );

    const shift = await prisma.shift.create({
      data: {
        title,
        description,
        startTime: shiftStartTime,
        endTime: shiftEndTime,
        organizationId: session.user.organizationId,
        createdById: session.user.id,
        assignedToId: assignedToId || null,
        isOpen: !assignedToId,
        categoryId: categoryId || null,
        locationId: locationId || null,
        scheduledBreakMinutes,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true, hourlyRate: true, color: true },
        },
      },
    });

    return NextResponse.json(shift);
  } catch (error) {
    console.error("Create shift error:", error);
    return NextResponse.json(
      { error: "Failed to create shift" },
      { status: 500 }
    );
  }
}
