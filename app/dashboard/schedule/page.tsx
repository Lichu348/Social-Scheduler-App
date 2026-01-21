import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ScheduleGridWithDnd } from "@/components/schedule-grid-with-dnd";
import { CreateShiftDialog } from "@/components/create-shift-dialog";
import { CreateEventDialog } from "@/components/create-event-dialog";
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

  const isAdmin = role === "ADMIN";

  // Get all locations for the organization (admins always have access to all)
  const allOrgLocations = await prisma.location.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Get list of locations this user can access
  // Admins always have access to ALL locations
  const userLocationIds = isAdmin
    ? allOrgLocations.map((l) => l.id)
    : (currentUser?.locationAccess.map((la) => la.location.id) || []);
  const userLocations = isAdmin
    ? allOrgLocations
    : (currentUser?.locationAccess.map((la) => la.location) || []);

  // Determine which location to filter by
  let filterLocationId: string | null = null;
  const isManager = role === "MANAGER";

  if (isAdmin) {
    // Admins can view all or filter by specific location
    filterLocationId = locationId && locationId !== "all" ? locationId : null;
  } else if (isManager || userLocationIds.length > 0) {
    // Managers and staff can only see their assigned locations
    if (locationId && userLocationIds.includes(locationId)) {
      filterLocationId = locationId;
    } else if (userLocationIds.length > 0) {
      // Default to first assigned location (or show all assigned if manager selects "all")
      if (locationId === "all" && isManager) {
        filterLocationId = null; // Will be filtered by userLocationIds below
      } else {
        filterLocationId = userLocationIds[0];
      }
    }
  }

  // Build location filter based on role
  let locationFilter: object = {};
  if (isAdmin) {
    // Admins can see all or filter by specific location
    locationFilter = filterLocationId ? { locationId: filterLocationId } : {};
  } else if (userLocationIds.length > 0) {
    // Managers and staff are restricted to their assigned locations
    if (filterLocationId) {
      locationFilter = { locationId: filterLocationId };
    } else {
      locationFilter = { locationId: { in: userLocationIds } };
    }
  }

  // Build event location filter - show events for the location OR org-wide events (no location)
  let eventLocationFilter: object = {};
  if (isAdmin) {
    eventLocationFilter = filterLocationId
      ? { OR: [{ locationId: filterLocationId }, { locationId: null }] }
      : {};
  } else if (userLocationIds.length > 0) {
    if (filterLocationId) {
      eventLocationFilter = { OR: [{ locationId: filterLocationId }, { locationId: null }] };
    } else {
      eventLocationFilter = { OR: [{ locationId: { in: userLocationIds } }, { locationId: null }] };
    }
  }

  const [shifts, users, organization, availability, categories, holidays, events] = await Promise.all([
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
    prisma.staffAvailability.findMany({
      where: {
        user: { organizationId },
      },
      select: {
        id: true,
        userId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        isRecurring: true,
        specificDate: true,
      },
    }),
    prisma.shiftCategory.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, hourlyRate: true, color: true },
      orderBy: { name: "asc" },
    }),
    // Fetch approved holidays that overlap with the current period
    prisma.holidayRequest.findMany({
      where: {
        user: { organizationId },
        status: "APPROVED",
        OR: [
          { startDate: { gte: startOfMonth, lt: endOfMonth } },
          { endDate: { gte: startOfMonth, lt: endOfMonth } },
          { AND: [{ startDate: { lt: startOfMonth } }, { endDate: { gte: endOfMonth } }] },
        ],
      },
      select: {
        id: true,
        userId: true,
        startDate: true,
        endDate: true,
        hours: true,
        reason: true,
      },
    }),
    // Fetch events that overlap with the current period
    prisma.event.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { startTime: { gte: startOfMonth, lt: endOfMonth } },
          { endTime: { gte: startOfMonth, lt: endOfMonth } },
          { AND: [{ startTime: { lt: startOfMonth } }, { endTime: { gte: endOfMonth } }] },
        ],
        ...eventLocationFilter,
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  return {
    shifts,
    users,
    breakRules: organization?.breakRules || "",
    allOrgLocations, // All locations for admins/managers
    userLocations, // User's assigned locations for staff dropdown
    currentLocationId: filterLocationId,
    userLocationIds,
    isMultiLocation: userLocationIds.length > 1,
    availability: availability.map((a) => ({
      ...a,
      specificDate: a.specificDate?.toISOString() || null,
    })),
    categories,
    holidays: holidays.map((h) => ({
      ...h,
      startDate: h.startDate.toISOString(),
      endDate: h.endDate.toISOString(),
    })),
    events: events.map((e) => ({
      ...e,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime.toISOString(),
    })),
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
    allOrgLocations,
    userLocations,
    currentLocationId,
    userLocationIds,
    isMultiLocation,
    availability,
    categories,
    holidays,
    events,
  } = await getScheduleData(
    session.user.organizationId,
    session.user.id,
    session.user.role,
    locationId
  );

  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
  const isAdmin = session.user.role === "ADMIN";

  // Determine which locations to show in dropdown
  // Admins see all locations
  // Managers see only their assigned locations (with "All My Locations" option if multiple)
  // Staff see only their assigned locations (no "All" option)
  const showLocationDropdown = allOrgLocations.length > 0;
  const dropdownLocations = isAdmin ? allOrgLocations : userLocations;
  const showAllOption = isAdmin || (isManager && userLocations.length > 1);

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
            <>
              <CreateEventDialog
                locations={isAdmin ? allOrgLocations : userLocations}
                defaultLocationId={currentLocationId}
              />
              <CreateShiftDialog
                users={users}
                breakRules={breakRules}
                locations={isAdmin ? allOrgLocations : userLocations}
                defaultLocationId={currentLocationId}
              />
            </>
          )}
        </div>
      </div>

      {!isAdmin && !isManager && userLocationIds.length === 0 && allOrgLocations.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          You haven't been assigned to any locations yet. Contact your admin to be assigned.
        </div>
      )}

      <ScheduleGridWithDnd
        shifts={shifts}
        users={users}
        currentUserId={session.user.id}
        isManager={isManager}
        availability={availability}
        locationId={currentLocationId}
        showSidebar={isManager}
        categories={categories}
        locations={isAdmin ? allOrgLocations : userLocations}
        holidays={holidays}
        events={events}
      />
    </div>
  );
}
