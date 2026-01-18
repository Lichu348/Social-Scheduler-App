import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/utils";
import { SwapRequestActions } from "@/components/swap-request-actions";

async function getSwapRequests(userId: string, organizationId: string, role: string) {
  const isManager = role === "MANAGER" || role === "ADMIN";

  return prisma.swapRequest.findMany({
    where: isManager
      ? { shift: { organizationId } }
      : {
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
    include: {
      shift: {
        select: { id: true, title: true, startTime: true, endTime: true },
      },
      fromUser: {
        select: { id: true, name: true, email: true },
      },
      toUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function SwapsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const requests = await getSwapRequests(
    session.user.id,
    session.user.organizationId,
    session.user.role
  );

  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const otherRequests = requests.filter((r) => r.status !== "PENDING");

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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Shift Swaps & Drops</h1>
        <p className="text-muted-foreground mt-1">
          {isManager
            ? "Review and manage shift swap and drop requests"
            : "View your swap and drop requests"}
        </p>
      </div>

      {pendingRequests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>
              {isManager
                ? "Requests awaiting your approval"
                : "Your pending requests"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{request.shift.title}</span>
                      <Badge variant="outline">
                        {request.type === "drop" ? "Drop" : "Swap"}
                      </Badge>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(request.shift.startTime)} •{" "}
                      {formatTime(request.shift.startTime)} -{" "}
                      {formatTime(request.shift.endTime)}
                    </p>
                    <p className="text-sm">
                      Requested by: <span className="font-medium">{request.fromUser.name}</span>
                      {request.toUser && (
                        <>
                          {" → "}
                          <span className="font-medium">{request.toUser.name}</span>
                        </>
                      )}
                    </p>
                    {request.message && (
                      <p className="text-sm text-muted-foreground italic">
                        &quot;{request.message}&quot;
                      </p>
                    )}
                  </div>
                  <SwapRequestActions
                    requestId={request.id}
                    isManager={isManager}
                    isOwner={request.fromUserId === session.user.id}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>Past swap and drop requests</CardDescription>
        </CardHeader>
        <CardContent>
          {otherRequests.length > 0 ? (
            <div className="space-y-4">
              {otherRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{request.shift.title}</span>
                      <Badge variant="outline">
                        {request.type === "drop" ? "Drop" : "Swap"}
                      </Badge>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(request.shift.startTime)} •{" "}
                      {formatTime(request.shift.startTime)} -{" "}
                      {formatTime(request.shift.endTime)}
                    </p>
                    <p className="text-sm">
                      {request.fromUser.name}
                      {request.toUser && ` → ${request.toUser.name}`}
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
