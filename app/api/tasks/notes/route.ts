import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET daily notes
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const locationId = searchParams.get("locationId");

    if (!date) {
      return NextResponse.json(
        { error: "date is required" },
        { status: 400 }
      );
    }

    const noteDate = new Date(date);
    noteDate.setHours(0, 0, 0, 0);

    const notes = await prisma.dailyNote.findMany({
      where: {
        organizationId: session.user.organizationId,
        date: noteDate,
        ...(locationId && { locationId }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Get notes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// POST create daily note
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers can create notes
    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { date, content, locationId, isImportant } = body;

    if (!date || !content) {
      return NextResponse.json(
        { error: "Date and content are required" },
        { status: 400 }
      );
    }

    const noteDate = new Date(date);
    noteDate.setHours(0, 0, 0, 0);

    const note = await prisma.dailyNote.create({
      data: {
        date: noteDate,
        content,
        priority: isImportant ? "HIGH" : "NORMAL",
        locationId: locationId || null,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Create note error:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
