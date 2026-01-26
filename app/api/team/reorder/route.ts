import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { order } = await req.json();

    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: order must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate all user IDs belong to the same organization
    const userIds = order.map((item: { id: string }) => item.id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, organizationId: true },
    });

    if (users.length !== userIds.length) {
      return NextResponse.json(
        { error: "One or more user IDs not found" },
        { status: 404 }
      );
    }

    const allSameOrg = users.every(
      (u) => u.organizationId === session.user.organizationId
    );
    if (!allSameOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Batch update sort orders in a transaction
    await prisma.$transaction(
      order.map((item: { id: string; sortOrder: number }) =>
        prisma.user.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder team error:", error);
    return NextResponse.json(
      { error: "Failed to reorder team" },
      { status: 500 }
    );
  }
}
