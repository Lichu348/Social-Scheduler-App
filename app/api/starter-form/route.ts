import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET: Returns current user's starter form (creates empty one if none exists)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find or create the starter form for this user
    let starterForm = await prisma.starterForm.findUnique({
      where: { userId: session.user.id },
    });

    if (!starterForm) {
      starterForm = await prisma.starterForm.create({
        data: {
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json(starterForm);
  } catch (error) {
    console.error("Get starter form error:", error);
    return NextResponse.json(
      { error: "Failed to get starter form" },
      { status: 500 }
    );
  }
}

// PUT: Updates current user's starter form data
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Don't allow updating status through this endpoint
    const {
      status: _status,
      submittedAt: _submittedAt,
      reviewedAt: _reviewedAt,
      reviewedById: _reviewedById,
      ...updateData
    } = body;

    // Parse date fields if they're strings
    if (updateData.dateOfBirth && typeof updateData.dateOfBirth === "string") {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }
    if (updateData.p45LeavingDate && typeof updateData.p45LeavingDate === "string") {
      updateData.p45LeavingDate = new Date(updateData.p45LeavingDate);
    }
    if (updateData.rightToWorkExpiry && typeof updateData.rightToWorkExpiry === "string") {
      updateData.rightToWorkExpiry = new Date(updateData.rightToWorkExpiry);
    }

    // Upsert the starter form
    const starterForm = await prisma.starterForm.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        userId: session.user.id,
        ...updateData,
      },
    });

    return NextResponse.json(starterForm);
  } catch (error) {
    console.error("Update starter form error:", error);
    return NextResponse.json(
      { error: "Failed to update starter form" },
      { status: 500 }
    );
  }
}
