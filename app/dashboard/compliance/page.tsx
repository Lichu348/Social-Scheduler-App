import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComplianceStaffView } from "@/components/compliance-staff-view";
import { ComplianceAdminView } from "@/components/compliance-admin-view";
import { ComplianceItemsManager } from "@/components/compliance-items-manager";

interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  staffRole: string;
  organizationId: string;
  organizationName: string;
}

export default async function CompliancePage() {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as ExtendedUser;
  const isAdmin = user.role === "ADMIN";
  const isManager = user.role === "MANAGER" || isAdmin;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Compliance</h1>
        <p className="text-muted-foreground mt-1">
          {isManager
            ? "Manage policies, qualifications, and track team compliance"
            : "View and acknowledge policies and qualifications"}
        </p>
      </div>

      {isManager ? (
        <Tabs defaultValue="my-compliance">
          <TabsList className="mb-6">
            <TabsTrigger value="my-compliance">My Compliance</TabsTrigger>
            <TabsTrigger value="team">Team Overview</TabsTrigger>
            {isAdmin && <TabsTrigger value="manage">Manage Items</TabsTrigger>}
          </TabsList>

          <TabsContent value="my-compliance">
            <ComplianceStaffView userId={user.id} staffRole={user.staffRole} />
          </TabsContent>

          <TabsContent value="team">
            <ComplianceAdminView />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="manage">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Items</CardTitle>
                  <CardDescription>
                    Create and manage policies (documents to acknowledge) and qualifications (certifications to track)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ComplianceItemsManager />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <ComplianceStaffView userId={user.id} staffRole={user.staffRole} />
      )}
    </div>
  );
}
