import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET segments for a shift
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const shift = await prisma.shift.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!shift || shift.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const segments = await prisma.shiftSegment.findMany({
      where: { shiftId: id },
      include: {
        category: {
          select: { id: true, name: true, hourlyRate: true, color: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(segments);
  } catch (error) {
    console.error("Get segments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch segments" },
      { status: 500 }
    );
  }
}

// PUT - Replace all segments for a shift
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers can edit segments
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { segments } = await req.json();

    const shift = await prisma.shift.findUnique({
      where: { id },
      select: { organizationId: true, startTime: true, endTime: true },
    });

    if (!shift || shift.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    // Validate segments
    if (segments && Array.isArray(segments)) {
      for (const segment of segments) {
        if (!segment.startTime || !segment.endTime || !segment.categoryId) {
          return NextResponse.json(
            { error: "Each segment must have startTime, endTime, and categoryId" },
            { status: 400 }
          );
        }

        const segStart = new Date(segment.startTime);
        const segEnd = new Date(segment.endTime);

        if (segEnd <= segStart) {
          return NextResponse.json(
            { error: "Segment end time must be after start time" },
            { status: 400 }
          );
        }

        // Segments must be within shift bounds
        if (segStart < shift.startTime || segEnd > shift.endTime) {
          return NextResponse.json(
            { error: "Segments must be within shift start and end times" },
            { status: 400 }
          );
        }
      }

      // Check for overlapping segments
      const sortedSegments = [...segments].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      for (let i = 1; i < sortedSegments.length; i++) {
        const prevEnd = new Date(sortedSegments[i - 1].endTime);
        const currStart = new Date(sortedSegments[i].startTime);
        if (currStart < prevEnd) {
          return NextResponse.json(
            { error: "Segments cannot overlap" },
            { status: 400 }
          );
        }
      }
    }

    // Delete existing segments and create new ones in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing segments
      await tx.shiftSegment.deleteMany({
        where: { shiftId: id },
      });

      // Create new segments
      if (segments && segments.length > 0) {
        await tx.shiftSegment.createMany({
          data: segments.map((seg: { startTime: string; endTime: string; categoryId: string }) => ({
            shiftId: id,
            startTime: new Date(seg.startTime),
            endTime: new Date(seg.endTime),
            categoryId: seg.categoryId,
          })),
        });
      }
    });

    // Fetch updated segments
    const updatedSegments = await prisma.shiftSegment.findMany({
      where: { shiftId: id },
      include: {
        category: {
          select: { id: true, name: true, hourlyRate: true, color: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(updatedSegments);
  } catch (error) {
    console.error("Update segments error:", error);
    return NextResponse.json(
      { error: "Failed to update segments" },
      { status: 500 }
    );
  }
}
