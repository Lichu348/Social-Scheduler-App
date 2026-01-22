import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createComplianceItemSchema } from "@/lib/schemas";
import { ValidationError } from "@/lib/errors";
import { handleApiError } from "@/lib/api-utils";

interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  staffRole: string;
  organizationId: string;
  organizationName: string;
}

// GET all compliance items for organization
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as ExtendedUser;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "POLICY" or "QUALIFICATION" or null for all

    const items = await prisma.complianceItem.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
        ...(type ? { type } : {}),
      },
      include: {
        userRecords: {
          where: {
            userId: user.id,
          },
          select: {
            id: true,
            issueDate: true,
            expiryDate: true,
            signature: true,
            signedAt: true,
            certificateNumber: true,
            status: true,
            // Review fields
            rating: true,
            managerNotes: true,
            employeeComments: true,
            goals: true,
            managerSignature: true,
            managerSignedAt: true,
            reviewedById: true,
          },
        },
        _count: {
          select: {
            userRecords: true,
          },
        },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    // Process items to add status info
    const now = new Date();
    const processedItems = items.map((item) => {
      const userRecord = item.userRecords[0] || null;
      let complianceStatus: "not_completed" | "completed" | "expired" | "pending_acknowledgment" = "not_completed";

      if (userRecord) {
        if (new Date(userRecord.expiryDate) < now) {
          complianceStatus = "expired";
        } else if (item.type === "REVIEW") {
          // Reviews require both manager and employee signatures
          if (userRecord.managerSignature && userRecord.signature) {
            complianceStatus = "completed";
          } else if (userRecord.managerSignature) {
            complianceStatus = "pending_acknowledgment"; // Manager completed, awaiting employee
          }
          // If no manager signature, it stays "not_completed"
        } else if (userRecord.signature) {
          complianceStatus = "completed";
        }
      }

      // Check if required for user's role
      let requiredRoles: string[] = [];
      try {
        requiredRoles = JSON.parse(item.requiredForRoles || "[]");
      } catch {
        requiredRoles = [];
      }
      const isRequiredForUser =
        item.isRequired || requiredRoles.includes(user.staffRole);

      return {
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        validityMonths: item.validityMonths,
        isRequired: item.isRequired,
        requiredForRoles: requiredRoles,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        requiresProof: item.requiresProof,
        createdAt: item.createdAt,
        userRecord,
        complianceStatus,
        isRequiredForUser,
        totalRecords: item._count.userRecords,
      };
    });

    return NextResponse.json(processedItems);
  } catch (error) {
    console.error("Get compliance items error:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance items" },
      { status: 500 }
    );
  }
}

// POST create new compliance item (admin only)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = createComplianceItemSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }

    const {
      name,
      description,
      type,
      validityMonths,
      isRequired,
      requiredForRoles,
      fileUrl,
      fileName,
      requiresProof,
    } = result.data;

    const item = await prisma.complianceItem.create({
      data: {
        name,
        description,
        type,
        validityMonths: validityMonths || 12,
        isRequired: isRequired || false,
        requiredForRoles: JSON.stringify(requiredForRoles || []),
        fileUrl,
        fileName,
        requiresProof: requiresProof || false,
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
