import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { HolidayRequestForm } from "@/components/holiday-request-form";
import { HolidayActions } from "@/components/holiday-actions";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

async function getHolidayData(userId: string, organizationId: string, role: string) {
  const isManager = role === "MANAGER" || role === "ADMIN";

  const [requests, user, teamUsers, teamHolidayRequests] = await Promise.all([
    prisma.holidayRequest.findMany({
      where: isManager
        ? { user: { organizationId } }
        : { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, holidayBalance: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { holidayBalance: true },
    }),
    // Get all team members for summary (managers only)
    isManager
      ? prisma.user.findMany({
          where: { organizationId },
          select: { id: true, name: true, holidayBalance: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    // Get approved holiday hours per user for the current year (managers only)
    isManager
      ? prisma.holidayRequest.groupBy({
          by: ["userId"],
          where: {
            user: { organizationId },
            status: "APPROVED",
            startDate: {
              gte: new Date(new Date().getFullYear(), 0, 1),
            },
          },
          _sum: {
            hours: true,
          },
        })
      : Promise.resolve([]),
  ]);

  // Create a map of used hours per user
  const usedHoursMap = new Map<string, number>();
  teamHolidayRequests.forEach((req) => {
    usedHoursMap.set(req.userId, req._sum.hours || 0);
  });

  return { requests, holidayBalance: user?.holidayBalance || 0, teamUsers, usedHoursMap };
}

function getHolidayStatus(balance: number, usedHours: number) {
  const totalAllowance = balance + usedHours;
  if (totalAllowance === 0) {
    return { color: "text-muted-foreground", bgColor: "bg-muted", label: "N/A" };
  }

  const remainingPercent = (balance / totalAllowance) * 100;

  if (balance <= 0) {
    return { color: "text-red-600", bgColor: "bg-red-50", label: "Exhausted" };
  } else if (remainingPercent <= 20) {
    return { color: "text-red-600", bgColor: "bg-red-50", label: "Low" };
  } else if (remainingPercent <= 40) {
    return { color: "text-amber-600", bgColor: "bg-amber-50", label: "Moderate" };
  } else {
    return { color: "text-green-600", bgColor: "bg-green-50", label: "Good" };
  }
}

export default async function HolidaysPage() {
  const session = await auth();
  if (!session?.user) return null;

  const { requests, holidayBalance, teamUsers, usedHoursMap } = await getHolidayData(
    session.user.id,
    session.user.organizationId,
    session.user.role
  );

  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const approvedRequests = requests.filter((r) => r.status === "APPROVED");
  const otherRequests = requests.filter(
    (r) => r.status !== "PENDING" && r.status !== "APPROVED"
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
      case "APPROVED":
        return <Badge variant="success">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Calculate used and pending days (for current user only)
  const usedHours = approvedRequests
    .filter((r) => r.userId === session.user.id)
    .reduce((total, r) => total + r.hours, 0);
  const pendingHours = pendingRequests
    .filter((r) => r.userId === session.user.id)
    .reduce((total, r) => total + r.hours, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Holidays</h1>
        <p className="text-muted-foreground mt-1">
          {isManager
            ? "Manage team holiday requests"
            : "Request and track your time off"}
        </p>
      </div>

      {/* Balance Card - shown to everyone */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Holiday Balance</CardTitle>
          <CardDescription>Your available time off</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-green-600">{holidayBalance}</p>
              <p className="text-sm text-muted-foreground">Hours Available</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{usedHours}</p>
              <p className="text-sm text-muted-foreground">Hours Used</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-yellow-600">{pendingHours}</p>
              <p className="text-sm text-muted-foreground">Hours Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Holiday Summary - Managers Only */}
      {isManager && teamUsers.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle>Team Holiday Allowances</CardTitle>
            </div>
            <CardDescription>Quick view of team member holiday balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {teamUsers.map((user) => {
                const userUsedHours = usedHoursMap.get(user.id) || 0;
                const status = getHolidayStatus(user.holidayBalance, userUsedHours);

                return (
                  <div
                    key={user.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      status.bgColor
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{user.name}</p>
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded",
                        status.bgColor,
                        status.color
                      )}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className={cn("text-2xl font-bold", status.color)}>
                        {user.holidayBalance}h
                      </span>
                      <span className="text-xs text-muted-foreground">remaining</span>
                    </div>
                    {userUsedHours > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {userUsedHours}h used this year
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Form - shown to everyone */}
        <Card>
          <CardHeader>
            <CardTitle>Request Time Off</CardTitle>
            <CardDescription>Submit a new holiday request</CardDescription>
          </CardHeader>
          <CardContent>
            <HolidayRequestForm maxHours={holidayBalance} />
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isManager ? "Team Pending Requests" : "Your Requests"}
            </CardTitle>
            <CardDescription>
              {isManager
                ? "Requests awaiting approval"
                : "Status of your holiday requests"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isManager && (
                          <span className="font-medium">{request.user.name}</span>
                        )}
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">{request.hours} hours</span>
                      </p>
                      {request.reason && (
                        <p className="text-sm text-muted-foreground italic">
                          &quot;{request.reason}&quot;
                        </p>
                      )}
                    </div>
                    <HolidayActions
                      requestId={request.id}
                      isManager={isManager}
                      isOwner={request.userId === session.user.id}
                    />
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
      </div>

      {/* Approved & Other Requests */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>Past and approved holiday requests</CardDescription>
        </CardHeader>
        <CardContent>
          {[...approvedRequests, ...otherRequests].length > 0 ? (
            <div className="space-y-4">
              {[...approvedRequests, ...otherRequests].map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isManager && (
                        <span className="font-medium">{request.user.name}</span>
                      )}
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">{request.hours} hours</span>
                    </p>
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
