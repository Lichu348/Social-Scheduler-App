import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { SettingSignoffForm } from "@/components/setting-signoff-form";
import { SettingSignoffFilters } from "@/components/setting-signoff-filters";
import { SettingSignoffDetail } from "@/components/setting-signoff-detail";
import { ClipboardCheck, MapPin, User, Calendar } from "lucide-react";

interface SettingSignoff {
  id: string;
  externalSetterName: string;
  inHouseSetterName: string;
  climbsTested: boolean;
  downClimbJugsOk: boolean;
  matsChecked: boolean;
  photos: string;
  notes: string | null;
  settingDate: Date;
  createdAt: Date;
  signedOffBy: { id: string; name: string; email: string };
  location: { id: string; name: string };
}

async function getSettingSignoffData(
  organizationId: string,
  locationId?: string,
  startDate?: string,
  endDate?: string
) {
  // Build where clause
  const where: {
    organizationId: string;
    locationId?: string;
    settingDate?: { gte?: Date; lte?: Date };
  } = {
    organizationId,
  };

  if (locationId) {
    where.locationId = locationId;
  }

  if (startDate || endDate) {
    where.settingDate = {};
    if (startDate) {
      where.settingDate.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.settingDate.lte = end;
    }
  }

  const [signoffs, locations] = await Promise.all([
    prisma.settingSignoff.findMany({
      where,
      include: {
        signedOffBy: {
          select: { id: true, name: true, email: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: { settingDate: "desc" },
    }),
    prisma.location.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Get stats
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const thisMonthSignoffs = signoffs.filter(
    (s) => new Date(s.settingDate) >= thisMonth
  );

  const byLocation = locations.map((loc) => ({
    location: loc,
    count: signoffs.filter((s) => s.location.id === loc.id).length,
    thisMonth: thisMonthSignoffs.filter((s) => s.location.id === loc.id).length,
  }));

  return {
    signoffs,
    locations,
    stats: {
      total: signoffs.length,
      thisMonth: thisMonthSignoffs.length,
      byLocation,
    },
  };
}

export default async function SettingSignoffsPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string; startDate?: string; endDate?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const params = await searchParams;
  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
  const isAdmin = session.user.role === "ADMIN";

  const { signoffs, locations, stats } = await getSettingSignoffData(
    session.user.organizationId,
    params.locationId,
    params.startDate,
    params.endDate
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Setting Sign-offs</h1>
          <p className="text-muted-foreground mt-1">
            Track and record route setting days
          </p>
        </div>
        {isManager && <SettingSignoffForm locations={locations} />}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sign-offs</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">Setting days</p>
          </CardContent>
        </Card>

        {stats.byLocation.slice(0, 2).map((loc) => (
          <Card key={loc.location.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{loc.location.name}</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loc.count}</div>
              <p className="text-xs text-muted-foreground">
                {loc.thisMonth} this month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <SettingSignoffFilters
        locations={locations}
        currentLocationId={params.locationId}
        currentStartDate={params.startDate}
        currentEndDate={params.endDate}
      />

      {/* Sign-offs List */}
      <Card>
        <CardHeader>
          <CardTitle>Sign-off History</CardTitle>
          <CardDescription>All recorded setting days</CardDescription>
        </CardHeader>
        <CardContent>
          {signoffs.length > 0 ? (
            <div className="space-y-4">
              {signoffs.map((signoff) => {
                const photos = JSON.parse(signoff.photos || "[]");
                return (
                  <div
                    key={signoff.id}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            <MapPin className="h-3 w-3 mr-1" />
                            {signoff.location.name}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(signoff.settingDate)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">External Setter: </span>
                            <span className="font-medium">{signoff.externalSetterName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">In-house Setter: </span>
                            <span className="font-medium">{signoff.inHouseSetterName}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant={signoff.climbsTested ? "success" : "destructive"}>
                            Climbs Tested
                          </Badge>
                          <Badge variant={signoff.downClimbJugsOk ? "success" : "destructive"}>
                            Down Climb Jugs OK
                          </Badge>
                          <Badge variant={signoff.matsChecked ? "success" : "destructive"}>
                            Mats Checked
                          </Badge>
                          {photos.length > 0 && (
                            <Badge variant="outline">{photos.length} photo(s)</Badge>
                          )}
                        </div>

                        {signoff.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            Notes: {signoff.notes}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Signed off by {signoff.signedOffBy.name}
                        </p>
                      </div>

                      <SettingSignoffDetail signoff={signoff as SettingSignoff} isAdmin={isAdmin} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No setting sign-offs found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
