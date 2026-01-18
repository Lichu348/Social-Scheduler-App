import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { timeEntryId, action } = await req.json();

    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: timeEntryId,
        userId: session.user.id,
        clockOut: null,
      },
    });

    if (!timeEntry) {
      return NextResponse.json(
        { error: "No active time entry found" },
        { status: 400 }
      );
    }

    if (action === "start") {
      if (timeEntry.breakStart) {
        return NextResponse.json(
          { error: "Already on break" },
          { status: 400 }
        );
      }

      const updatedEntry = await prisma.timeEntry.update({
        where: { id: timeEntryId },
        data: {
          breakStart: new Date(),
        },
      });

      return NextResponse.json(updatedEntry);
    } else if (action === "end") {
      if (!timeEntry.breakStart) {
        return NextResponse.json(
          { error: "Not on break" },
          { status: 400 }
        );
      }

      const breakDuration = Math.round(
        (new Date().getTime() - new Date(timeEntry.breakStart).getTime()) / (1000 * 60)
      );

      const updatedEntry = await prisma.timeEntry.update({
        where: { id: timeEntryId },
        data: {
          breakStart: null,
          breakEnd: new Date(),
          totalBreak: timeEntry.totalBreak + breakDuration,
        },
      });

      return NextResponse.json(updatedEntry);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Break error:", error);
    return NextResponse.json(
      { error: "Failed to process break" },
      { status: 500 }
    );
  }
}
