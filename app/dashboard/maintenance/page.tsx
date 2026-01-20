import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaintenanceOverview } from "@/components/maintenance-overview";
import { MaintenanceHistory } from "@/components/maintenance-history";
import { MaintenanceCheckTypesManager } from "@/components/maintenance-check-types-manager";

interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  staffRole: string;
  organizationId: string;
  organizationName: string;
}

export default async function MaintenancePage() {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as ExtendedUser;
  const isAdmin = user.role === "ADMIN";
  const isManager = user.role === "MANAGER" || isAdmin;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Maintenance</h1>
        <p className="text-muted-foreground mt-1">
          {isManager
            ? "Track and sign off on safety checks for all locations"
            : "View safety check status for your locations"}
        </p>
      </div>

      <Tabs defaultValue="today">
        <TabsList className="mb-6">
          <TabsTrigger value="today">Today&apos;s Checks</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          {isAdmin && <TabsTrigger value="check-types">Check Types</TabsTrigger>}
        </TabsList>

        <TabsContent value="today">
          <MaintenanceOverview userName={user.name || "User"} />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>
                View past maintenance logs and filter by location, date, or status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaintenanceHistory />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="check-types">
            <Card>
              <CardHeader>
                <CardTitle>Check Types</CardTitle>
                <CardDescription>
                  Configure maintenance check types and their frequencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceCheckTypesManager />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
