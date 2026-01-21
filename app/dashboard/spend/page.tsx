import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { CreateSpendDialog } from "@/components/create-spend-dialog";
import { ReviewSpendDialog } from "@/components/review-spend-dialog";
import { SpendSummary } from "@/components/spend-summary";
import { SpendActions } from "@/components/spend-actions";
import { SpendFilters } from "@/components/spend-filters";
import {
  Wrench,
  Package,
  Settings,
  Megaphone,
  GraduationCap,
  MoreHorizontal,
} from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  EQUIPMENT: <Wrench className="h-4 w-4" />,
  SUPPLIES: <Package className="h-4 w-4" />,
  MAINTENANCE: <Settings className="h-4 w-4" />,
  MARKETING: <Megaphone className="h-4 w-4" />,
  TRAINING: <GraduationCap className="h-4 w-4" />,
  OTHER: <MoreHorizontal className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  EQUIPMENT: "Equipment",
  SUPPLIES: "Supplies",
  MAINTENANCE: "Maintenance",
  MARKETING: "Marketing",
  TRAINING: "Training",
  OTHER: "Other",
};

interface SpendRequest {
  id: string;
  title: string;
  description: string | null;
  justification: string;
  amount: number;
  category: string;
  status: string;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  requestedBy: { id: string; name: string; email: string };
  reviewedBy: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
}

async function getSpendData(
  userId: string,
  organizationId: string,
  role: string,
  month?: string,
  status?: string,
  locationId?: string
) {
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER" || isAdmin;

  if (!isManager) {
    return { requests: [], locations: [], summary: null };
  }

  // Build where clause
  const where: {
    organizationId: string;
    status?: string;
    locationId?: string;
    requestedById?: string;
    createdAt?: { gte: Date; lt: Date };
  } = {
    organizationId,
  };

  // Managers can only see their own requests, admins see all
  if (!isAdmin) {
    where.requestedById = userId;
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (locationId) {
    where.locationId = locationId;
  }

  if (month) {
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);
    where.createdAt = { gte: startDate, lt: endDate };
  }

  const [requests, locations] = await Promise.all([
    prisma.spendRequest.findMany({
      where,
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.location.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Get summary data for admins
  let summary = null;
  if (isAdmin) {
    const now = new Date();
    const [year, monthNum] = month
      ? month.split("-").map(Number)
      : [now.getFullYear(), now.getMonth() + 1];

    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    const allMonthRequests = await prisma.spendRequest.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate, lt: endDate },
      },
    });

    const pendingTotal = allMonthRequests
      .filter((r) => r.status === "PENDING")
      .reduce((sum, r) => sum + r.amount, 0);
    const pendingCount = allMonthRequests.filter((r) => r.status === "PENDING").length;

    const approvedTotal = allMonthRequests
      .filter((r) => r.status === "APPROVED")
      .reduce((sum, r) => sum + r.amount, 0);
    const approvedCount = allMonthRequests.filter((r) => r.status === "APPROVED").length;

    const rejectedTotal = allMonthRequests
      .filter((r) => r.status === "REJECTED")
      .reduce((sum, r) => sum + r.amount, 0);
    const rejectedCount = allMonthRequests.filter((r) => r.status === "REJECTED").length;

    summary = {
      pending: { total: pendingTotal, count: pendingCount },
      approved: { total: approvedTotal, count: approvedCount },
      rejected: { total: rejectedTotal, count: rejectedCount },
    };
  }

  return { requests, locations, summary };
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return <Badge variant="warning">Pending</Badge>;
    case "APPROVED":
      return <Badge variant="success">Approved</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

export default async function SpendPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string; locationId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const params = await searchParams;
  const isAdmin = session.user.role === "ADMIN";
  const isManager = session.user.role === "MANAGER" || isAdmin;

  if (!isManager) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Spend Tracking</h1>
        <p className="text-muted-foreground mt-4">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  const { requests, locations, summary } = await getSpendData(
    session.user.id,
    session.user.organizationId,
    session.user.role,
    params.month,
    params.status,
    params.locationId
  );

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const otherRequests = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Spend Tracking</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "Review and approve spend requests"
              : "Submit and track your spend requests"}
          </p>
        </div>
        <CreateSpendDialog locations={locations} />
      </div>

      {/* Summary Cards - Admin Only */}
      {isAdmin && summary && <SpendSummary summary={summary} />}

      {/* Filters */}
      <SpendFilters
        locations={locations}
        currentMonth={params.month}
        currentStatus={params.status}
        currentLocationId={params.locationId}
      />

      {/* Pending Requests */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {isAdmin ? "Pending Approval" : "Your Pending Requests"}
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Spend requests awaiting your review"
              : "Requests waiting for admin approval"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-muted">
                        {categoryIcons[request.category]}
                      </div>
                      <span className="font-medium">{request.title}</span>
                      {getStatusBadge(request.status)}
                      <Badge variant="outline">{categoryLabels[request.category]}</Badge>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(request.amount)}
                    </p>
                    {isAdmin && (
                      <p className="text-sm text-muted-foreground">
                        Requested by {request.requestedBy.name}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatDate(request.createdAt)}
                      {request.location && ` - ${request.location.name}`}
                    </p>
                    {request.description && (
                      <p className="text-sm">{request.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground italic">
                      Justification: {request.justification}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {isAdmin ? (
                      <ReviewSpendDialog request={request as SpendRequest} />
                    ) : (
                      <SpendActions
                        requestId={request.id}
                        isOwner={request.requestedBy.id === session.user.id}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No pending requests
            </p>
          )}
        </CardContent>
      </Card>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>Approved and rejected spend requests</CardDescription>
        </CardHeader>
        <CardContent>
          {otherRequests.length > 0 ? (
            <div className="space-y-4">
              {otherRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-muted">
                        {categoryIcons[request.category]}
                      </div>
                      <span className="font-medium">{request.title}</span>
                      {getStatusBadge(request.status)}
                      <Badge variant="outline">{categoryLabels[request.category]}</Badge>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(request.amount)}
                    </p>
                    {isAdmin && (
                      <p className="text-sm text-muted-foreground">
                        Requested by {request.requestedBy.name}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatDate(request.createdAt)}
                      {request.location && ` - ${request.location.name}`}
                    </p>
                    {request.reviewedBy && (
                      <p className="text-sm text-muted-foreground">
                        {request.status === "APPROVED" ? "Approved" : "Rejected"} by{" "}
                        {request.reviewedBy.name}
                        {request.reviewedAt && ` on ${formatDate(request.reviewedAt)}`}
                      </p>
                    )}
                    {request.reviewNotes && (
                      <p className="text-sm text-muted-foreground italic">
                        Notes: {request.reviewNotes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No request history
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
