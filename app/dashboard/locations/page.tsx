import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocationsManager } from "@/components/locations-manager";
import { MapPin, Users } from "lucide-react";

async function getLocationsData(organizationId: string) {
  const locations = await prisma.location.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: { staff: true, shifts: true, primaryUsers: true },
      },
      staff: {
        include: {
          user: {
            select: { id: true, name: true, staffRole: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return locations;
}

export default async function LocationsPage() {
  const session = await auth();
  if (!session?.user) return null;

  // Only admins can access this page
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const locations = await getLocationsData(session.user.organizationId);

  const activeLocations = locations.filter((l) => l.isActive);
  const totalStaffAssigned = locations.reduce((sum, l) => sum + l._count.primaryUsers, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Locations</h1>
        <p className="text-muted-foreground mt-1">
          Manage your gym locations and their clock-in zones
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{locations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeLocations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Staff Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalStaffAssigned}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add/Manage Locations */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Locations</CardTitle>
            <CardDescription>
              Add new gym locations with GPS coordinates for clock-in verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LocationsManager />
          </CardContent>
        </Card>

        {/* Location Details */}
        <Card>
          <CardHeader>
            <CardTitle>Location Staff</CardTitle>
            <CardDescription>
              View staff assigned to each location
            </CardDescription>
          </CardHeader>
          <CardContent>
            {locations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No locations configured yet.</p>
            ) : (
              <div className="space-y-4">
                {locations.map((location) => (
                  <div key={location.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{location.name}</span>
                        {!location.isActive && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {location._count.primaryUsers} staff
                      </Badge>
                    </div>
                    {location.address && (
                      <p className="text-sm text-muted-foreground mb-2">{location.address}</p>
                    )}
                    {location._count.primaryUsers > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {location.staff.slice(0, 5).map((s) => (
                          <span
                            key={s.id}
                            className="text-xs bg-muted px-2 py-1 rounded"
                          >
                            {s.user.name}
                          </span>
                        ))}
                        {location.staff.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            +{location.staff.length - 5} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No staff assigned</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
