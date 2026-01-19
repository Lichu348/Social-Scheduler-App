import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ScheduleWithDnd } from "@/components/schedule-with-dnd";
import { ShiftTemplateSidebar } from "@/components/shift-template-sidebar";
import { CreateShiftDialog } from "@/components/create-shift-dialog";
import { LocationScheduleFilter } from "@/components/location-schedule-filter";

async function getScheduleData(organizationId: string, userId: string, role: string, locationId?: string | null) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 2);

  // Get user's assigned locations (via LocationStaff)
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      primaryLocationId: true,
      locationAccess: {
        select: {
          location: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  // Get list of locations this user can access
  const userLocationIds = currentUser?.locationAccess.map((la) => la.location.id) || [];
  const userLocations = currentUser?.locationAccess.map((la) => la.location) || [];

  // Determine which location to filter by
  let filterLocationId: string | null = null;
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";

  if (isAdmin || isManager) {
    // Admins/managers can view all or filter by specific location
    filterLocationId = locationId && locationId !== "all" ? locationId : null;
  } else if (userLocationIds.length > 0) {
    // Staff can only see their assigned locations
    if (locationId && userLocationIds.includes(locationId)) {
      filterLocationId = locationId;
    } else {
      // Default to first assigned location
      filterLocationId = userLocationIds[0];
    }
  }

  // For non-admin/manager, restrict to their assigned locations if no specific filter
  const locationFilter = isAdmin || isManager
    ? (filterLocationId ? { locationId: filterLocationId } : {})
    : (filterLocationId
      ? { locationId: filterLocationId }
      : (userLocationIds.length > 0 ? { locationId: { in: userLocationIds } } : {}));

  const [shifts, users, organization, allLocations] = await Promise.all([
    prisma.shift.findMany({
      where: {
        organizationId,
        startTime: { gte: startOfMonth, lt: endOfMonth },
        ...locationFilter,
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
        ...(filterLocationId ? {
          locationAccess: { some: { locationId: filterLocationId } },
        } : {}),
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
    allLocations, // All locations for admins/managers
    userLocations, // User's assigned locations for staff dropdown
    currentLocationId: filterLocationId,
    userLocationIds,
    isMultiLocation: userLocationIds.length > 1,
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

  const {
    shifts,
    users,
    breakRules,
    allLocations,
    userLocations,
    currentLocationId,
    userLocationIds,
    isMultiLocation,
  } = await getScheduleData(
    session.user.organizationId,
    session.user.id,
    session.user.role,
    locationId
  );

  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
  const isAdmin = session.user.role === "ADMIN";

  // Determine which locations to show in dropdown
  // Admins/managers see all locations with "All Locations" option
  // Staff see only their assigned locations (no "All" option)
  const showLocationDropdown = allLocations.length > 0;
  const dropdownLocations = isAdmin || isManager ? allLocations : userLocations;
  const showAllOption = isAdmin || isManager;

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
          {showLocationDropdown && (isAdmin || isManager || userLocations.length > 0) && (
            <LocationScheduleFilter
              locations={dropdownLocations}
              currentLocationId={currentLocationId || (showAllOption ? "all" : dropdownLocations[0]?.id || "")}
              showAllOption={showAllOption}
            />
          )}
          {isManager && (
            <CreateShiftDialog
              users={users}
              breakRules={breakRules}
              locations={allLocations}
              defaultLocationId={currentLocationId}
            />
          )}
        </div>
      </div>

      {!isAdmin && !isManager && userLocationIds.length === 0 && allLocations.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          You haven't been assigned to any locations yet. Contact your admin to be assigned.
        </div>
      )}

      <div className="flex gap-6">
        {isManager && <ShiftTemplateSidebar />}
        <div className="flex-1 min-w-0">
          <ScheduleWithDnd
            shifts={shifts}
            users={users}
            currentUserId={session.user.id}
            isManager={isManager}
            locationId={currentLocationId}
          />
        </div>
      </div>
    </div>
  );
}
