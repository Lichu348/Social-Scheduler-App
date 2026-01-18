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
        locationLatitude: true,
        locationLongitude: true,
        clockInRadiusMetres: true,
        requireGeolocation: true,
      },
    });

    // Validate geolocation if required
    if (organization?.requireGeolocation) {
      if (organization.locationLatitude === null || organization.locationLongitude === null) {
        // Org location not configured - skip geolocation check
      } else if (latitude === undefined || longitude === undefined) {
        return NextResponse.json(
          {
            error: "Please enable location services to clock in",
            code: "LOCATION_REQUIRED"
          },
          { status: 400 }
        );
      } else {
        const distance = getDistanceMetres(
          latitude,
          longitude,
          organization.locationLatitude,
          organization.locationLongitude
        );

        if (distance > organization.clockInRadiusMetres) {
          return NextResponse.json(
            {
              error: `You must be within ${organization.clockInRadiusMetres}m of the gym to clock in. You are currently ${Math.round(distance)}m away.`,
              code: "TOO_FAR"
            },
            { status: 400 }
          );
        }
      }
    }

    const clockInWindowMinutes = organization?.clockInWindowMinutes ?? 15;
    const now = new Date();

    // If a shift is provided, validate clock-in window
    if (shiftId) {
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
      });

      if (!shift) {
        return NextResponse.json(
          { error: "Shift not found" },
          { status: 404 }
        );
      }

      // Check if shift belongs to user
      if (shift.assignedToId !== session.user.id) {
        return NextResponse.json(
          { error: "This shift is not assigned to you" },
          { status: 403 }
        );
      }

      // Calculate allowed clock-in window
      const earliestClockIn = new Date(shift.startTime.getTime() - clockInWindowMinutes * 60 * 1000);
      const latestClockIn = shift.endTime;

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
    } else {
      // No shift provided - check if user has a scheduled shift they should be clocking into
      const upcomingShift = await prisma.shift.findFirst({
        where: {
          assignedToId: session.user.id,
          status: "SCHEDULED",
          startTime: {
            gte: new Date(now.getTime() - clockInWindowMinutes * 60 * 1000),
            lte: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Within next 24 hours
          },
        },
        orderBy: { startTime: "asc" },
      });

      // If there's an upcoming shift within the window, auto-associate
      if (upcomingShift) {
        const earliestClockIn = new Date(upcomingShift.startTime.getTime() - clockInWindowMinutes * 60 * 1000);

        if (now >= earliestClockIn && now <= upcomingShift.endTime) {
          // Auto-associate with the shift
          const timeEntry = await prisma.timeEntry.create({
            data: {
              userId: session.user.id,
              shiftId: upcomingShift.id,
              clockIn: now,
              clockInLatitude: latitude ?? null,
              clockInLongitude: longitude ?? null,
            },
          });
          return NextResponse.json(timeEntry);
        }
      }
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: session.user.id,
        shiftId: shiftId || null,
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
