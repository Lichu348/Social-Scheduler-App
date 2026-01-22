import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET all shifts for a date range (for staff to see who they're working with)
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Get user's locations so we only show shifts at locations they work at
    const userLocations = await prisma.locationStaff.findMany({
      where: { userId: session.user.id },
      select: { locationId: true },
    });
    const locationIds = userLocations.map((l) => l.locationId);

    // Get all shifts within the date range at user's locations
    const shifts = await prisma.shift.findMany({
      where: {
        organizationId: session.user.organizationId,
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        // Only show shifts at locations the user is assigned to
        ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
      },
      include: {
        location: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(shifts);
  } catch (error) {
    console.error("Get all shifts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shifts" },
      { status: 500 }
    );
  }
}
