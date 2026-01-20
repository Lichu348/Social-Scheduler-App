import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Get rates for a user
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view rates
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: userId } = await params;

    // Get user with their rates
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        categoryRates: {
          include: {
            category: {
              select: { id: true, name: true, color: true, hourlyRate: true },
            },
          },
        },
      },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all categories for the organization
    const allCategories = await prisma.shiftCategory.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      orderBy: { name: "asc" },
    });

    // Map categories with user rates (use user rate if exists, otherwise default)
    const ratesWithDefaults = allCategories.map((category) => {
      const userRate = user.categoryRates.find((r) => r.categoryId === category.id);
      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
        defaultRate: category.hourlyRate,
        userRate: userRate?.hourlyRate ?? null,
        effectiveRate: userRate?.hourlyRate ?? category.hourlyRate,
        hasCustomRate: !!userRate,
      };
    });

    return NextResponse.json(ratesWithDefaults);
  } catch (error) {
    console.error("Get user rates error:", error);
    return NextResponse.json(
      { error: "Failed to get user rates" },
      { status: 500 }
    );
  }
}

// Update rates for a user
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update rates
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: userId } = await params;
    const { rates } = await req.json();

    // Verify user belongs to same org
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // rates is an array of { categoryId, hourlyRate } or { categoryId, hourlyRate: null } to remove
    for (const rate of rates) {
      if (rate.hourlyRate === null || rate.hourlyRate === undefined || rate.hourlyRate === "") {
        // Remove custom rate (will fall back to default)
        await prisma.userCategoryRate.deleteMany({
          where: {
            userId,
            categoryId: rate.categoryId,
          },
        });
      } else {
        // Upsert rate
        await prisma.userCategoryRate.upsert({
          where: {
            userId_categoryId: {
              userId,
              categoryId: rate.categoryId,
            },
          },
          update: {
            hourlyRate: parseFloat(rate.hourlyRate),
          },
          create: {
            userId,
            categoryId: rate.categoryId,
            hourlyRate: parseFloat(rate.hourlyRate),
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user rates error:", error);
    return NextResponse.json(
      { error: "Failed to update user rates" },
      { status: 500 }
    );
  }
}
