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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can update events
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify the event belongs to the user's organization
    const existingEvent = await prisma.event.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
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

    // Get color based on event type (if changed)
    const color = eventType
      ? EVENT_TYPE_COLORS[eventType] || EVENT_TYPE_COLORS.OTHER
      : undefined;

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(eventType !== undefined && { eventType, color }),
        ...(startTime !== undefined && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: new Date(endTime) }),
        ...(expectedGuests !== undefined && {
          expectedGuests: expectedGuests ? parseInt(expectedGuests) : null,
        }),
        ...(staffRequired !== undefined && {
          staffRequired: staffRequired ? parseInt(staffRequired) : null,
        }),
        ...(locationId !== undefined && { locationId: locationId || null }),
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
    console.error("Update event error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
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

    // Only managers and admins can delete events
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify the event belongs to the user's organization
    const existingEvent = await prisma.event.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
