import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserCertifications, formatCertificationError } from "@/lib/certification-utils";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Employees can only check their own certifications
    if (session.user.role === "EMPLOYEE" && userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await checkUserCertifications(userId, session.user.organizationId);

    return NextResponse.json({
      ...result,
      errorMessage: result.isValid ? null : formatCertificationError(result),
    });
  } catch (error) {
    console.error("Check certifications error:", error);
    return NextResponse.json(
      { error: "Failed to check certifications" },
      { status: 500 }
    );
  }
}
