import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET: Returns a team member's starter form (Managers/Admins only)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can view team member forms
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify the user belongs to the same organization
    const user = await prisma.user.findUnique({
      where: { id },
      select: { organizationId: true, name: true },
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

    return NextResponse.json({
      ...starterForm,
      userName: user.name,
    });
  } catch (error) {
    console.error("Get team starter form error:", error);
    return NextResponse.json(
      { error: "Failed to get starter form" },
      { status: 500 }
    );
  }
}
