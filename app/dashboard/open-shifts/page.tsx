import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenShiftCard } from "@/components/open-shift-card";
import { Hand } from "lucide-react";

async function getOpenShifts(organizationId: string, locationId?: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.shift.findMany({
    where: {
      organizationId,
      isOpen: true,
      startTime: { gte: today },
      ...(locationId ? { locationId } : {}),
    },
    include: {
      category: {
        select: { id: true, name: true, hourlyRate: true, color: true },
      },
      location: {
        select: { id: true, name: true },
      },
    },
    orderBy: { startTime: "asc" },
  });
}

async function getLocations(organizationId: string) {
  return prisma.location.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function OpenShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const params = await searchParams;
  const locationId = params.location || null;

  const [openShifts, locations] = await Promise.all([
    getOpenShifts(session.user.organizationId, locationId),
    getLocations(session.user.organizationId),
  ]);

  // Group shifts by date
  const shiftsByDate = openShifts.reduce(
    (acc, shift) => {
      const dateKey = new Date(shift.startTime).toISOString().split("T")[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(shift);
      return acc;
    },
    {} as Record<string, typeof openShifts>
  );

  const dateKeys = Object.keys(shiftsByDate).sort();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Hand className="h-8 w-8" />
          Open Shifts
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse and claim available shifts
        </p>
      </div>

      {/* Location Filter */}
      {locations.length > 1 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <a
                href="/dashboard/open-shifts"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !locationId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                All Locations
              </a>
              {locations.map((location) => (
                <a
                  key={location.id}
                  href={`/dashboard/open-shifts?location=${location.id}`}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    locationId === location.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {location.name}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Shifts */}
      {dateKeys.length > 0 ? (
        <div className="space-y-8">
          {dateKeys.map((dateKey) => {
            const date = new Date(dateKey);
            const formattedDate = date.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            });

            return (
              <div key={dateKey}>
                <h2 className="text-lg font-semibold mb-4">{formattedDate}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {shiftsByDate[dateKey].map((shift) => (
                    <OpenShiftCard
                      key={shift.id}
                      shift={{
                        ...shift,
                        startTime: shift.startTime.toISOString(),
                        endTime: shift.endTime.toISOString(),
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Open Shifts</CardTitle>
            <CardDescription>
              There are no open shifts available at the moment. Check back later
              or ask your manager about upcoming opportunities.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
