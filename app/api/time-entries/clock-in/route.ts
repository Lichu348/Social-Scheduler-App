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

    // Validate clock-in window
    const earliestClockIn = new Date(targetShift.startTime.getTime() - clockInWindowMinutes * 60 * 1000);
    const latestClockIn = targetShift.endTime;

    if (now < earliestClockIn) {
      const minutesUntil = Math.ceil((earliestClockIn.getTime() - now.getTime()) / (60 * 1000));
      return NextResponse.json(
        {
          error: `You can only clock in within ${clockInWindowMinutes} minutes of your shift start time. Please wait ${minutesUntil} more minutes.`,
          code: "TOO_EARLY"
        },
        { status: 400 }
      );
    }

    if (now > latestClockIn) {
      return NextResponse.json(
        {
          error: "This shift has already ended. Please contact your manager.",
          code: "SHIFT_ENDED"
        },
        { status: 400 }
      );
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
      },
    });

    return NextResponse.json(timeEntry);
  } catch (error) {
    console.error("Clock in error:", error);
    return NextResponse.json(
      { error: "Failed to clock in" },
      { status: 500 }
    );
  }
}
