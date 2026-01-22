import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkUserCertifications, formatCertificationError } from "@/lib/certification-utils";
import { createShiftSchema } from "@/lib/schemas";
import { ValidationError } from "@/lib/errors";
import { handleApiError } from "@/lib/api-utils";

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

    // Verify the current user still exists (session might be stale after DB changes)
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "Session expired. Please log out and log back in." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = createShiftSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }

    const { title, description, startTime, endTime, assignedToId, categoryId, locationId } = result.data;

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

    // Get break rules: location-specific if provided, otherwise organization defaults
    let breakRulesJson = "[]";

    if (locationId) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { breakRules: true },
      });
      if (location?.breakRules) {
        breakRulesJson = location.breakRules;
      }
    }

    // Fall back to organization break rules if location doesn't have custom rules
    if (breakRulesJson === "[]") {
      const organization = await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { breakRules: true },
      });
      breakRulesJson = organization?.breakRules || "[]";
    }

    const shiftStartTime = new Date(startTime);
    const shiftEndTime = new Date(endTime);
    const scheduledBreakMinutes = calculateScheduledBreak(
      shiftStartTime,
      shiftEndTime,
      breakRulesJson
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
    return handleApiError(error);
  }
}
