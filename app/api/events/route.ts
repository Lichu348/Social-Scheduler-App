import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Event type colors
const EVENT_TYPE_COLORS: Record<string, string> = {
  PARTY: "#ec4899",      // Pink
  GROUP: "#f59e0b",      // Orange
  TRAINING: "#3b82f6",   // Blue
  COMPETITION: "#8b5cf6", // Purple
  OTHER: "#6b7280",      // Gray
};

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const locationId = searchParams.get("locationId");

    const events = await prisma.event.findMany({
      where: {
        organizationId: session.user.organizationId,
        isActive: true,
        ...(startDate && endDate
          ? {
              OR: [
                // Event starts within the range
                {
                  startTime: { gte: new Date(startDate), lt: new Date(endDate) },
                },
                // Event ends within the range
                {
                  endTime: { gte: new Date(startDate), lt: new Date(endDate) },
                },
                // Event spans the entire range
                {
                  startTime: { lt: new Date(startDate) },
                  endTime: { gt: new Date(endDate) },
                },
              ],
            }
          : {}),
        ...(locationId && locationId !== "all"
          ? {
              OR: [
                { locationId },
                { locationId: null }, // Show org-wide events regardless of location filter
              ],
            }
          : {}),
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Get events error:", error);
    return NextResponse.json(
      { error: "Failed to get events" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can create events
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      title,
      description,
      eventType,
      startTime,
      endTime,
      expectedGuests,
      staffRequired,
      locationId,
    } = await req.json();

    if (!title || !eventType || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, event type, start time, and end time are required" },
        { status: 400 }
      );
    }

    // Validate event type
    const validTypes = ["PARTY", "GROUP", "TRAINING", "COMPETITION", "OTHER"];
    if (!validTypes.includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Get color based on event type
    const color = EVENT_TYPE_COLORS[eventType] || EVENT_TYPE_COLORS.OTHER;

    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        eventType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        expectedGuests: expectedGuests ? parseInt(expectedGuests) : null,
        staffRequired: staffRequired ? parseInt(staffRequired) : null,
        color,
        organizationId: session.user.organizationId,
        locationId: locationId || null,
        createdById: session.user.id,
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
