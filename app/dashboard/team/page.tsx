import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TeamMemberActions } from "@/components/team-member-actions";
import { StaffLocationsDialog } from "@/components/staff-locations-dialog";
import { UserRatesDialog } from "@/components/user-rates-dialog";
import { MonthlySalaryEditor } from "@/components/monthly-salary-editor";
import { PaymentTypeSelector } from "@/components/payment-type-selector";
import { EditUserDialog } from "@/components/edit-user-dialog";
import { HolidayAllowanceDialog } from "@/components/holiday-allowance-dialog";
import { ResetPasswordDialog } from "@/components/reset-password-dialog";
import { StarterFormStatusBadge } from "@/components/starter-form-status-badge";
import { ViewStarterFormDialog } from "@/components/view-starter-form-dialog";
import { LocationScheduleFilter } from "@/components/location-schedule-filter";
import { UserPlus, Palmtree, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

async function getTeamData(organizationId: string, locationId?: string | null) {
  // Build location filter for users
  const locationFilter = locationId && locationId !== "all"
    ? { locationAccess: { some: { locationId } } }
    : {};

  const [users, locations, holidayRequests] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, ...locationFilter },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffRole: true,
        paymentType: true,
        monthlySalary: true,
        contractedHours: true,
        sortOrder: true,
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
        starterForm: {
          select: {
            status: true,
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
      orderBy: [{ sortOrder: "asc" }, { role: "asc" }, { name: "asc" }],
    }),
    prisma.location.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // Get approved holiday hours per user for the current year
    prisma.holidayRequest.groupBy({
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
    }),
  ]);

  // Create a map of used hours per user
  const usedHoursMap = new Map<string, number>();
  holidayRequests.forEach((req) => {
    usedHoursMap.set(req.userId, req._sum.hours || 0);
  });

  return { users, locations, usedHoursMap };
}

function getHolidayStatus(balance: number, usedHours: number) {
  // Calculate what percentage is remaining
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

interface TeamPageProps {
  searchParams: Promise<{ location?: string }>;
}

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const session = await auth();
  if (!session?.user) return null;

  const params = await searchParams;
  const locationId = params.location;

  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
  const isAdmin = session.user.role === "ADMIN";
  const { users, locations, usedHoursMap } = await getTeamData(session.user.organizationId, locationId);

  const showLocationFilter = locations.length > 0;
  const showAllOption = isAdmin || isManager;

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

  // Holiday summary stats for managers
  const totalHolidayRemaining = users.reduce((sum, u) => sum + u.holidayBalance, 0);
  const usersWithLowHoliday = users.filter((u) => {
    const usedHours = usedHoursMap.get(u.id) || 0;
    const status = getHolidayStatus(u.holidayBalance, usedHours);
    return status.label === "Low" || status.label === "Exhausted";
  });

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
        <div className="flex items-center gap-3">
          {showLocationFilter && (
            <LocationScheduleFilter
              locations={locations}
              currentLocationId={locationId || (showAllOption ? "all" : locations[0]?.id || "")}
              showAllOption={showAllOption}
            />
          )}
          {isManager && (
            <Link href="/dashboard/team/invite">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Team Member
              </Button>
            </Link>
          )}
        </div>
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

      {/* Holiday Summary for Managers */}
      {isManager && (
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Palmtree className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Team Holiday Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-green-50">
                <p className="text-3xl font-bold text-green-600">{totalHolidayRemaining}h</p>
                <p className="text-sm text-muted-foreground">Total Remaining</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Staff Members</p>
              </div>
              <div className={cn(
                "text-center p-4 rounded-lg",
                usersWithLowHoliday.length > 0 ? "bg-amber-50" : "bg-green-50"
              )}>
                <p className={cn(
                  "text-3xl font-bold",
                  usersWithLowHoliday.length > 0 ? "text-amber-600" : "text-green-600"
                )}>
                  {usersWithLowHoliday.length}
                </p>
                <p className="text-sm text-muted-foreground">Low/Exhausted Allowance</p>
              </div>
            </div>
            {usersWithLowHoliday.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-md">
                <p className="text-sm font-medium text-amber-800">
                  Staff with low holiday balance:
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {usersWithLowHoliday.map(u => u.name).join(", ")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>All members of {session.user.organizationName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => {
              const usedHours = usedHoursMap.get(user.id) || 0;
              const holidayStatus = getHolidayStatus(user.holidayBalance, usedHours);

              return (
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
                    {/* Starter Form Status */}
                    {isManager && (
                      <div className="text-right">
                        <StarterFormStatusBadge status={user.starterForm?.status || null} />
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <FileText className="h-3 w-3 inline mr-1" />
                          Starter Form
                        </p>
                      </div>
                    )}
                    {isManager && user.starterForm?.status && user.starterForm.status !== "INCOMPLETE" && (
                      <ViewStarterFormDialog
                        userId={user.id}
                        userName={user.name}
                        formStatus={user.starterForm.status}
                      />
                    )}
                    <div className="text-right">
                      <p className="text-sm font-medium">{user._count.assignedShifts}</p>
                      <p className="text-xs text-muted-foreground">Shifts</p>
                    </div>
                    {/* Enhanced Holiday Display */}
                    <div className="text-right">
                      <div className={cn(
                        "px-2 py-1 rounded-md text-sm font-medium inline-block",
                        holidayStatus.bgColor,
                        holidayStatus.color
                      )}>
                        {user.holidayBalance}h
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Holiday ({holidayStatus.label})
                      </p>
                      {isManager && usedHours > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {usedHours}h used this year
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <HolidayAllowanceDialog
                        userId={user.id}
                        userName={user.name}
                        currentBalance={user.holidayBalance}
                      />
                    )}
                    {isAdmin && (
                      <div className="text-right">
                        <PaymentTypeSelector
                          userId={user.id}
                          currentPaymentType={user.paymentType}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Pay Type</p>
                      </div>
                    )}
                    {isAdmin && user.paymentType === "HOURLY" && (
                      <UserRatesDialog
                        userId={user.id}
                        userName={user.name}
                      />
                    )}
                    {isAdmin && user.paymentType === "MONTHLY" && (
                      <MonthlySalaryEditor
                        userId={user.id}
                        userName={user.name}
                        currentSalary={user.monthlySalary}
                      />
                    )}
                    {isAdmin && locations.length > 0 && (
                      <StaffLocationsDialog
                        userId={user.id}
                        userName={user.name}
                        assignedLocationIds={user.locationAccess.map((la) => la.location.id)}
                        allLocations={locations}
                      />
                    )}
                    {isAdmin && (
                      <EditUserDialog
                        userId={user.id}
                        currentName={user.name}
                        currentEmail={user.email}
                        currentContractedHours={user.contractedHours}
                        currentSortOrder={user.sortOrder}
                      />
                    )}
                    {isAdmin && user.id !== session.user.id && (
                      <ResetPasswordDialog
                        userId={user.id}
                        userName={user.name}
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
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
