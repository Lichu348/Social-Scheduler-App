import { auth } from "@/lib/auth";
import { MaintenancePageContent } from "@/components/maintenance-page-content";

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

      <MaintenancePageContent
        userName={user.name || "User"}
        userRole={user.role}
        isAdmin={isAdmin}
        isManager={isManager}
      />
    </div>
  );
}
