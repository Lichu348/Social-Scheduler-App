import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TeamMemberActions } from "@/components/team-member-actions";
import { StaffLocationsDialog } from "@/components/staff-locations-dialog";
import { UserPlus } from "lucide-react";

async function getTeamData(organizationId: string) {
  const [users, locations] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffRole: true,
        phone: true,
        holidayBalance: true,
        createdAt: true,
        locationAccess: {
          select: {
            location: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: {
            assignedShifts: true,
            timeEntries: true,
            certifications: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.location.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { users, locations };
}

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) return null;

  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
  const isAdmin = session.user.role === "ADMIN";
  const { users, locations } = await getTeamData(session.user.organizationId);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge variant="default">Admin</Badge>;
      case "MANAGER":
        return <Badge variant="secondary">Manager</Badge>;
      default:
        return <Badge variant="outline">Employee</Badge>;
    }
  };

  const getStaffRoleBadge = (staffRole: string) => {
    const colors: Record<string, string> = {
      DESK: "bg-blue-100 text-blue-800",
      COACH: "bg-green-100 text-green-800",
      SETTER: "bg-purple-100 text-purple-800",
      INSTRUCTOR: "bg-orange-100 text-orange-800",
    };
    const labels: Record<string, string> = {
      DESK: "Front Desk",
      COACH: "Coach",
      SETTER: "Setter",
      INSTRUCTOR: "Instructor",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[staffRole] || "bg-gray-100 text-gray-800"}`}>
        {labels[staffRole] || staffRole}
      </span>
    );
  };

  const admins = users.filter((u) => u.role === "ADMIN");
  const managers = users.filter((u) => u.role === "MANAGER");
  const employees = users.filter((u) => u.role === "EMPLOYEE");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-muted-foreground mt-1">
            {isManager
              ? "Manage your team members"
              : "View your team"}
          </p>
        </div>
        {isManager && (
          <Link href="/dashboard/team/invite">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
          </Link>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{admins.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{managers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{employees.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>All members of {session.user.organizationName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-lg">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      {getRoleBadge(user.role)}
                      {getStaffRoleBadge(user.staffRole)}
                      {user.id === session.user.id && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {user.phone && <span>{user.phone}</span>}
                      {user.locationAccess.length > 0 && (
                        <span className="flex items-center gap-1">
                          {user.phone && <span>•</span>}
                          {user.locationAccess.map((la) => la.location.name).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium">{user._count.assignedShifts}</p>
                    <p className="text-xs text-muted-foreground">Shifts</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{user.holidayBalance}</p>
                    <p className="text-xs text-muted-foreground">Holiday Days</p>
                  </div>
                  {isAdmin && locations.length > 0 && (
                    <StaffLocationsDialog
                      userId={user.id}
                      userName={user.name}
                      assignedLocationIds={user.locationAccess.map((la) => la.location.id)}
                      allLocations={locations}
                    />
                  )}
                  {isManager && user.id !== session.user.id && (
                    <TeamMemberActions
                      userId={user.id}
                      currentRole={user.role}
                      currentStaffRole={user.staffRole}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
