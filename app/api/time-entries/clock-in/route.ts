import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getDistanceMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in metres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shiftId, latitude, longitude } = await req.json();

    // Check if already clocked in
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        clockOut: null,
      },
    });

    if (activeEntry) {
      return NextResponse.json(
        { error: "Already clocked in" },
        { status: 400 }
      );
    }

    // Get organization settings
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        clockInWindowMinutes: true,
        requireGeolocation: true,
      },
    });

    const clockInWindowMinutes = organization?.clockInWindowMinutes ?? 15;
    const now = new Date();

    // Find the shift to clock into
    let targetShift = null;

    if (shiftId) {
      // Specific shift provided
      targetShift = await prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
          location: {
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
              clockInRadiusMetres: true,
            },
          },
        },
      });

      if (!targetShift) {
        return NextResponse.json(
          { error: "Shift not found" },
          { status: 404 }
        );
      }

      // Check if shift belongs to user
      if (targetShift.assignedToId !== session.user.id) {
        return NextResponse.json(
          { error: "This shift is not assigned to you" },
          { status: 403 }
        );
      }
    } else {
      // No shift provided - find user's upcoming shift
      targetShift = await prisma.shift.findFirst({
        where: {
          assignedToId: session.user.id,
          status: "SCHEDULED",
          startTime: {
            gte: new Date(now.getTime() - clockInWindowMinutes * 60 * 1000),
            lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
              clockInRadiusMetres: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
      });
    }

    // Require a shift to clock in
    if (!targetShift) {
      return NextResponse.json(
        {
          error: "No shift found. You can only clock in when you have a scheduled shift.",
          code: "NO_SHIFT"
        },
        { status: 400 }
      );
    }

    // Check clock-in timing thresholds
    // Early: more than 10 mins before shift start needs approval
    // Late: more than 5 mins after shift start needs approval
    const EARLY_THRESHOLD_MINS = 10;
    const LATE_THRESHOLD_MINS = 5;

    const shiftStart = targetShift.startTime;
    const shiftEnd = targetShift.endTime;
    const minutesBeforeShift = (shiftStart.getTime() - now.getTime()) / (60 * 1000);
    const minutesAfterShift = (now.getTime() - shiftStart.getTime()) / (60 * 1000);

    let clockInFlag: string | null = null;
    let clockInApproved = true;

    // Check if shift has ended
    if (now > shiftEnd) {
      return NextResponse.json(
        {
          error: "This shift has already ended. Please contact your manager.",
          code: "SHIFT_ENDED"
        },
        { status: 400 }
      );
    }

    // Check if too early (more than 10 mins before shift)
    if (minutesBeforeShift > EARLY_THRESHOLD_MINS) {
      clockInFlag = "EARLY";
      clockInApproved = false;
    }

    // Check if late (more than 5 mins after shift start)
    if (minutesAfterShift > LATE_THRESHOLD_MINS) {
      clockInFlag = "LATE";
      clockInApproved = false;
    }

    // Validate geolocation against the shift's location (if configured)
    if (organization?.requireGeolocation && targetShift.location) {
      const location = targetShift.location;

      if (location.latitude !== null && location.longitude !== null) {
        if (latitude === undefined || longitude === undefined) {
          return NextResponse.json(
            {
              error: "Please enable location services to clock in",
              code: "LOCATION_REQUIRED"
            },
            { status: 400 }
          );
        }

        const distance = getDistanceMetres(
          latitude,
          longitude,
          location.latitude,
          location.longitude
        );

        const radius = location.clockInRadiusMetres || 100;
        if (distance > radius) {
          return NextResponse.json(
            {
              error: `You must be within ${radius}m of ${location.name} to clock in. You are currently ${Math.round(distance)}m away.`,
              code: "TOO_FAR"
            },
            { status: 400 }
          );
        }
      }
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: session.user.id,
        shiftId: targetShift.id,
        clockIn: now,
        clockInLatitude: latitude ?? null,
        clockInLongitude: longitude ?? null,
        clockInFlag,
        clockInApproved,
      },
    });

    // Return with flag info so the frontend can show a message
    return NextResponse.json({
      ...timeEntry,
      requiresApproval: !clockInApproved,
      flagReason: clockInFlag === "EARLY"
        ? "You clocked in more than 10 minutes early. This requires manager approval."
        : clockInFlag === "LATE"
        ? "You clocked in more than 5 minutes late. This requires manager approval."
        : null,
    });
  } catch (error) {
    console.error("Clock in error:", error);
    return NextResponse.json(
      { error: "Failed to clock in" },
      { status: 500 }
    );
  }
}
