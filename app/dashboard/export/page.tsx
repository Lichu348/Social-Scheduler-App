import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TimesheetExportForm } from "@/components/timesheet-export-form";

async function getExportData(organizationId: string) {
  const locations = await prisma.location.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { locations };
}

export default async function ExportPage() {
  const session = await auth();
  if (!session?.user) return null;

  // Only managers and admins can access
  if (session.user.role === "EMPLOYEE") {
    redirect("/dashboard");
  }

  const { locations } = await getExportData(session.user.organizationId);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Export Timesheets</h1>
        <p className="text-muted-foreground mt-1">
          Export timesheet data for payroll and record keeping
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Export</CardTitle>
          <CardDescription>
            Select a date range and location to export timesheet data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimesheetExportForm locations={locations} />
        </CardContent>
      </Card>
    </div>
  );
}
