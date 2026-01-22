import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");

    // Get open shifts from today onwards
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openShifts = await prisma.shift.findMany({
      where: {
        organizationId: session.user.organizationId,
        isOpen: true,
        startTime: { gte: today },
        ...(locationId ? { locationId } : {}),
      },
      include: {
        category: {
          select: { id: true, name: true, hourlyRate: true, color: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(openShifts);
  } catch (error) {
    console.error("Get open shifts error:", error);
    return NextResponse.json(
      { error: "Failed to get open shifts" },
      { status: 500 }
    );
  }
}
