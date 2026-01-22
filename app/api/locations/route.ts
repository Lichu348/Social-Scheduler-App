import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createLocationSchema } from "@/lib/schemas";
import { ValidationError } from "@/lib/errors";
import { handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locations = await prisma.location.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        _count: {
          select: { staff: true, shifts: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Get locations error:", error);
    return NextResponse.json(
      { error: "Failed to get locations" },
      { status: 500 }
    );
  }
}

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
    const result = createLocationSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }

    const { name, address, latitude, longitude, clockInRadiusMetres, breakRules } = result.data;

    const location = await prisma.location.create({
      data: {
        name,
        address: address || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        clockInRadiusMetres: clockInRadiusMetres ?? 100,
        breakRules: breakRules || null,
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    return handleApiError(error);
  }
}
