import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { StarterFormPDF } from "@/components/starter-form-pdf";

// GET: Generates and returns PDF of the starter form (Managers/Admins only)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can download PDFs
    if (session.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify the user belongs to the same organization
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        organizationId: true,
        name: true,
        organization: {
          select: { name: true }
        }
      },
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

    // Generate the PDF
    const pdfBuffer = await renderToBuffer(
      StarterFormPDF({
        form: starterForm,
        employeeName: user.name,
        organizationName: user.organization.name
      })
    );

    // Return the PDF as a download
    const fileName = `starter-form-${user.name.replace(/\s+/g, "-").toLowerCase()}.pdf`;

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Generate starter form PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
