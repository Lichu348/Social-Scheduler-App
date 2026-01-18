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
      clockInWindowMinutes,
      clockOutGraceMinutes,
      shiftReminderHours,
      locationLatitude,
      locationLongitude,
      clockInRadiusMetres,
      requireGeolocation,
    } = await req.json();

    const updatedOrg = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        name: name || undefined,
        timezone: timezone || undefined,
        breakRules: breakRules || undefined,
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
