import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // Format: YYYY-MM

    // Default to current month if not specified
    const now = new Date();
    const [year, monthNum] = month
      ? month.split("-").map(Number)
      : [now.getFullYear(), now.getMonth() + 1];

    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    // Get all requests for the month
    const requests = await prisma.spendRequest.findMany({
      where: {
        organizationId: session.user.organizationId,
        createdAt: { gte: startDate, lt: endDate },
      },
    });

    // Calculate totals by status
    const pendingTotal = requests
      .filter((r) => r.status === "PENDING")
      .reduce((sum, r) => sum + r.amount, 0);
    const pendingCount = requests.filter((r) => r.status === "PENDING").length;

    const approvedTotal = requests
      .filter((r) => r.status === "APPROVED")
      .reduce((sum, r) => sum + r.amount, 0);
    const approvedCount = requests.filter((r) => r.status === "APPROVED").length;

    const rejectedTotal = requests
      .filter((r) => r.status === "REJECTED")
      .reduce((sum, r) => sum + r.amount, 0);
    const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

    // Calculate totals by category
    const categories = ["EQUIPMENT", "SUPPLIES", "MAINTENANCE", "MARKETING", "TRAINING", "OTHER"];
    const byCategory = categories.map((category) => {
      const categoryRequests = requests.filter(
        (r) => r.category === category && r.status === "APPROVED"
      );
      return {
        category,
        total: categoryRequests.reduce((sum, r) => sum + r.amount, 0),
        count: categoryRequests.length,
      };
    });

    // Get monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const trendDate = new Date(year, monthNum - 1 - i, 1);
      const trendEndDate = new Date(year, monthNum - i, 1);

      const monthRequests = await prisma.spendRequest.findMany({
        where: {
          organizationId: session.user.organizationId,
          createdAt: { gte: trendDate, lt: trendEndDate },
          status: "APPROVED",
        },
      });

      monthlyTrend.push({
        month: `${trendDate.getFullYear()}-${String(trendDate.getMonth() + 1).padStart(2, "0")}`,
        label: trendDate.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
        total: monthRequests.reduce((sum, r) => sum + r.amount, 0),
        count: monthRequests.length,
      });
    }

    return NextResponse.json({
      period: {
        month: `${year}-${String(monthNum).padStart(2, "0")}`,
        label: new Date(year, monthNum - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      },
      byStatus: {
        pending: { total: pendingTotal, count: pendingCount },
        approved: { total: approvedTotal, count: approvedCount },
        rejected: { total: rejectedTotal, count: rejectedCount },
      },
      byCategory,
      monthlyTrend,
      totalRequested: pendingTotal + approvedTotal + rejectedTotal,
      totalApproved: approvedTotal,
    });
  } catch (error) {
    console.error("Get spend summary error:", error);
    return NextResponse.json(
      { error: "Failed to get spend summary" },
      { status: 500 }
    );
  }
}
