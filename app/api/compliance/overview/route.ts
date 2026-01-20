import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET compliance overview for all users (admin/manager only)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const now = new Date();

    // Get all compliance items
    const items = await prisma.complianceItem.findMany({
      where: {
        organizationId: session.user.organizationId,
        isActive: true,
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    // For managers, get their assigned location IDs
    let managerLocationIds: string[] = [];
    if (!isAdmin) {
      const managerLocations = await prisma.locationStaff.findMany({
        where: { userId: session.user.id },
        select: { locationId: true },
      });
      managerLocationIds = managerLocations.map((l) => l.locationId);
    }

    // Get users - admins see all, managers see only users at their locations
    const users = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
        // Managers only see users who share at least one location with them
        ...(isAdmin
          ? {}
          : {
              locationAccess: {
                some: {
                  locationId: { in: managerLocationIds },
                },
              },
            }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        staffRole: true,
        complianceRecords: {
          select: {
            id: true,
            complianceItemId: true,
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
      },
      orderBy: { name: "asc" },
    });

    // Build compliance matrix
    const matrix = users.map((user) => {
      const compliance: Record<
        string,
        {
          status: "completed" | "expired" | "pending" | "pending_ack" | "not_required";
          record: typeof user.complianceRecords[0] | null;
        }
      > = {};

      for (const item of items) {
        const record = user.complianceRecords.find(
          (r) => r.complianceItemId === item.id
        );

        const requiredRoles = JSON.parse(item.requiredForRoles || "[]");
        const isRequired =
          item.isRequired || requiredRoles.includes(user.staffRole);

        if (!isRequired) {
          compliance[item.id] = { status: "not_required", record: null };
        } else if (item.type === "REVIEW") {
          // Reviews have a different workflow
          if (!record || !record.managerSignature) {
            compliance[item.id] = { status: "pending", record: record || null };
          } else if (new Date(record.expiryDate) < now) {
            compliance[item.id] = { status: "expired", record };
          } else if (!record.signature) {
            compliance[item.id] = { status: "pending_ack", record }; // Awaiting employee acknowledgment
          } else {
            compliance[item.id] = { status: "completed", record };
          }
        } else if (!record || !record.signature) {
          compliance[item.id] = { status: "pending", record: null };
        } else if (new Date(record.expiryDate) < now) {
          compliance[item.id] = { status: "expired", record };
        } else {
          compliance[item.id] = { status: "completed", record };
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        staffRole: user.staffRole,
        compliance,
      };
    });

    // Calculate summary stats
    const stats = {
      totalItems: items.length,
      totalUsers: users.length,
      policies: items.filter((i) => i.type === "POLICY").length,
      qualifications: items.filter((i) => i.type === "QUALIFICATION").length,
      reviews: items.filter((i) => i.type === "REVIEW").length,
      expiringSoon: 0, // Count records expiring in next 30 days
      expired: 0,
      pending: 0,
      pendingAck: 0, // Reviews awaiting employee acknowledgment
    };

    for (const user of matrix) {
      for (const itemId of Object.keys(user.compliance)) {
        const c = user.compliance[itemId];
        if (c.status === "expired") stats.expired++;
        if (c.status === "pending") stats.pending++;
        if (c.status === "pending_ack") stats.pendingAck++;
        if (
          c.record &&
          c.status === "completed" &&
          new Date(c.record.expiryDate) <
            new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        ) {
          stats.expiringSoon++;
        }
      }
    }

    return NextResponse.json({
      items,
      users: matrix,
      stats,
    });
  } catch (error) {
    console.error("Get compliance overview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance overview" },
      { status: 500 }
    );
  }
}
