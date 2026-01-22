import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update organization
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      name,
      timezone,
      breakRules,
      breakCalculationMode,
      clockInWindowMinutes,
      clockOutGraceMinutes,
      shiftReminderHours,
      locationLatitude,
      locationLongitude,
      clockInRadiusMetres,
      requireGeolocation,
    } = await req.json();

    // Validate breakCalculationMode if provided
    if (breakCalculationMode && !["PER_SHIFT", "PER_DAY"].includes(breakCalculationMode)) {
      return NextResponse.json(
        { error: "Invalid break calculation mode" },
        { status: 400 }
      );
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        name: name || undefined,
        timezone: timezone || undefined,
        breakRules: breakRules || undefined,
        breakCalculationMode: breakCalculationMode || undefined,
        clockInWindowMinutes: clockInWindowMinutes !== undefined ? clockInWindowMinutes : undefined,
        clockOutGraceMinutes: clockOutGraceMinutes !== undefined ? clockOutGraceMinutes : undefined,
        shiftReminderHours: shiftReminderHours !== undefined ? shiftReminderHours : undefined,
        locationLatitude: locationLatitude !== undefined ? locationLatitude : undefined,
        locationLongitude: locationLongitude !== undefined ? locationLongitude : undefined,
        clockInRadiusMetres: clockInRadiusMetres !== undefined ? clockInRadiusMetres : undefined,
        requireGeolocation: requireGeolocation !== undefined ? requireGeolocation : undefined,
      },
    });

    return NextResponse.json(updatedOrg);
  } catch (error) {
    console.error("Update organization error:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}
