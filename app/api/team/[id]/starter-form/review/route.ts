import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST: Marks form as REVIEWED (Managers/Admins only)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can mark forms as reviewed
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify the user belongs to the same organization
    const user = await prisma.user.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the starter form
    const starterForm = await prisma.starterForm.findUnique({
      where: { userId: id },
    });

    if (!starterForm) {
      return NextResponse.json(
        { error: "Starter form not found" },
        { status: 404 }
      );
    }

    // Check the form has been submitted
    if (starterForm.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Form must be submitted before it can be reviewed" },
        { status: 400 }
      );
    }

    // Update the form status
    const updatedForm = await prisma.starterForm.update({
      where: { userId: id },
      data: {
        status: "REVIEWED",
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    });

    return NextResponse.json(updatedForm);
  } catch (error) {
    console.error("Review starter form error:", error);
    return NextResponse.json(
      { error: "Failed to mark form as reviewed" },
      { status: 500 }
    );
  }
}
