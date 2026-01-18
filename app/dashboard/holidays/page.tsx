import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { HolidayRequestForm } from "@/components/holiday-request-form";
import { HolidayActions } from "@/components/holiday-actions";

async function getHolidayData(userId: string, organizationId: string, role: string) {
  const isManager = role === "MANAGER" || role === "ADMIN";

  const [requests, user] = await Promise.all([
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
  ]);

  return { requests, holidayBalance: user?.holidayBalance || 0 };
}

export default async function HolidaysPage() {
  const session = await auth();
  if (!session?.user) return null;

  const { requests, holidayBalance } = await getHolidayData(
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

  // Calculate used and pending days
  const usedDays = approvedRequests.reduce((total, r) => total + r.days, 0);
  const pendingDays = pendingRequests
    .filter((r) => r.userId === session.user.id)
    .reduce((total, r) => total + r.days, 0);

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

      {/* Balance Card */}
      {!isManager && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Holiday Balance</CardTitle>
            <CardDescription>Your available time off</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold text-green-600">{holidayBalance}</p>
                <p className="text-sm text-muted-foreground">Days Available</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold">{usedDays}</p>
                <p className="text-sm text-muted-foreground">Days Used</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold text-yellow-600">{pendingDays}</p>
                <p className="text-sm text-muted-foreground">Days Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Form */}
        {!isManager && (
          <Card>
            <CardHeader>
              <CardTitle>Request Time Off</CardTitle>
              <CardDescription>Submit a new holiday request</CardDescription>
            </CardHeader>
            <CardContent>
              <HolidayRequestForm maxDays={holidayBalance} />
            </CardContent>
          </Card>
        )}

        {/* Pending Requests */}
        <Card className={isManager ? "lg:col-span-2" : ""}>
          <CardHeader>
            <CardTitle>
              {isManager ? "Pending Requests" : "Your Requests"}
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
                        <span className="font-medium">{request.days} days</span>
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
                      <span className="font-medium">{request.days} days</span>
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
