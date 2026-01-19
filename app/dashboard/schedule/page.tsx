import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { CreateShiftDialog } from "@/components/create-shift-dialog";
import { LocationScheduleFilter } from "@/components/location-schedule-filter";

async function getScheduleData(organizationId: string, userId: string, role: string, locationId?: string | null) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 2);

  // Get user's primary location for non-admins
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { primaryLocationId: true },
  });

  // Determine which location to filter by
  let filterLocationId: string | null = null;
  if (role === "ADMIN" && locationId) {
    filterLocationId = locationId === "all" ? null : locationId;
  } else if (role !== "ADMIN") {
    filterLocationId = currentUser?.primaryLocationId || null;
  }

  const [shifts, users, organization, locations] = await Promise.all([
    prisma.shift.findMany({
      where: {
        organizationId,
        startTime: { gte: startOfMonth, lt: endOfMonth },
        ...(filterLocationId ? { locationId: filterLocationId } : {}),
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true, hourlyRate: true, color: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.user.findMany({
      where: {
        organizationId,
        ...(filterLocationId ? { primaryLocationId: filterLocationId } : {}),
      },
      select: { id: true, name: true, email: true, role: true, staffRole: true },
      orderBy: { name: "asc" },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { breakRules: true },
    }),
    prisma.location.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    shifts,
    users,
    breakRules: organization?.breakRules || "",
    locations,
    currentLocationId: filterLocationId,
    userLocationId: currentUser?.primaryLocationId,
  };
}

interface SchedulePageProps {
  searchParams: Promise<{ location?: string }>;
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const session = await auth();
  if (!session?.user) return null;

  const params = await searchParams;
  const locationId = params.location;

  const { shifts, users, breakRules, locations, currentLocationId, userLocationId } = await getScheduleData(
    session.user.organizationId,
    session.user.id,
    session.user.role,
    locationId
  );

  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground mt-1">
            {isManager
              ? "Manage and assign shifts for your team"
              : "View your upcoming shifts"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && locations.length > 0 && (
            <LocationScheduleFilter
              locations={locations}
              currentLocationId={locationId || "all"}
            />
          )}
          {isManager && (
            <CreateShiftDialog
              users={users}
              breakRules={breakRules}
              locations={locations}
              defaultLocationId={currentLocationId}
            />
          )}
        </div>
      </div>

      {!isAdmin && !userLocationId && locations.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          You haven't been assigned to a location yet. Contact your admin to be assigned.
        </div>
      )}

      <ScheduleCalendar
        shifts={shifts}
        users={users}
        currentUserId={session.user.id}
        isManager={isManager}
      />
    </div>
  );
}
