import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Staff sign their own certification
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { certificationId, signature } = await req.json();

    if (!certificationId || !signature) {
      return NextResponse.json(
        { error: "Certification ID and signature are required" },
        { status: 400 }
      );
    }

    // Find the certification
    const certification = await prisma.userCertification.findUnique({
      where: { id: certificationId },
      include: { user: true },
    });

    if (!certification) {
      return NextResponse.json(
        { error: "Certification not found" },
        { status: 404 }
      );
    }

    // Staff can only sign their own certifications
    if (certification.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only sign your own certifications" },
        { status: 403 }
      );
    }

    // Check if already signed
    if (certification.staffSignedAt) {
      return NextResponse.json(
        { error: "This certification has already been signed" },
        { status: 400 }
      );
    }

    // Update with signature
    const updated = await prisma.userCertification.update({
      where: { id: certificationId },
      data: {
        staffSignature: signature.trim(),
        staffSignedAt: new Date(),
      },
      include: {
        certificationType: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Sign certification error:", error);
    return NextResponse.json(
      { error: "Failed to sign certification" },
      { status: 500 }
    );
  }
}
