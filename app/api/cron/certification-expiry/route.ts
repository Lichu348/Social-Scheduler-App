import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification, createNotifications } from "@/lib/notifications";

// This route runs daily to:
// 1. Send notifications for certifications expiring in 14 days
// 2. Mark expired certifications as EXPIRED

export async function GET(req: Request) {
  try {
    // Require CRON_SECRET for authorization
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    let expiryNotificationsCreated = 0;
    let certificationsMarkedExpired = 0;

    // 1. Find certifications expiring within 14 days that haven't been notified yet
    const expiringCertifications = await prisma.userCertification.findMany({
      where: {
        status: "ACTIVE",
        expiryDate: {
          not: null,
          lte: fourteenDaysFromNow,
          gt: now, // Not yet expired
        },
        lastExpiryNotification: null, // Haven't notified yet
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
        certificationType: {
          select: {
            name: true,
          },
        },
      },
    });

    // Create notifications for expiring certifications
    for (const cert of expiringCertifications) {
      const daysUntilExpiry = Math.ceil(
        (cert.expiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Notify the staff member
      await createNotification({
        userId: cert.user.id,
        type: "CERTIFICATION_EXPIRY",
        title: "Certification Expiring Soon",
        message: `Your ${cert.certificationType.name} certification expires in ${daysUntilExpiry} days`,
        link: "/dashboard/certifications",
      });

      // Notify all managers and admins in the organization
      const managers = await prisma.user.findMany({
        where: {
          organizationId: cert.user.organizationId,
          role: { in: ["MANAGER", "ADMIN"] },
        },
        select: { id: true },
      });

      if (managers.length > 0) {
        await createNotifications(
          managers.map((manager) => ({
            userId: manager.id,
            type: "CERTIFICATION_EXPIRY",
            title: "Staff Certification Expiring",
            message: `${cert.user.name}'s ${cert.certificationType.name} certification expires in ${daysUntilExpiry} days`,
            link: "/dashboard/certifications",
          }))
        );
      }

      // Update lastExpiryNotification to prevent duplicates
      await prisma.userCertification.update({
        where: { id: cert.id },
        data: { lastExpiryNotification: now },
      });

      expiryNotificationsCreated++;
    }

    // 2. Mark expired certifications as EXPIRED
    const expiredResult = await prisma.userCertification.updateMany({
      where: {
        status: "ACTIVE",
        expiryDate: {
          not: null,
          lt: now,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    certificationsMarkedExpired = expiredResult.count;

    return NextResponse.json({
      success: true,
      expiryNotificationsCreated,
      certificationsMarkedExpired,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Certification expiry cron error:", error);
    return NextResponse.json(
      { error: "Failed to process certification expiry" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(req: Request) {
  return GET(req);
}
