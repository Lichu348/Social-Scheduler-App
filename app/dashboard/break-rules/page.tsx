import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BreakRulesWithLocations } from "@/components/break-rules-with-locations";

async function getBreakRulesData(organizationId: string) {
  const [organization, locations] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { breakRules: true, breakCalculationMode: true },
    }),
    prisma.location.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, breakRules: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    organizationBreakRules: organization?.breakRules || "[]",
    organizationBreakCalculationMode: organization?.breakCalculationMode || "PER_SHIFT",
    locations,
  };
}

export default async function BreakRulesPage() {
  const session = await auth();
  if (!session?.user) return null;

  // Only admins can access
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { organizationBreakRules, organizationBreakCalculationMode, locations } = await getBreakRulesData(
    session.user.organizationId
  );

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Break Rules</h1>
        <p className="text-muted-foreground mt-1">
          Configure automatic unpaid break times based on shift duration
        </p>
      </div>

      <div className="space-y-6">
        <BreakRulesWithLocations
          organizationBreakRules={organizationBreakRules}
          organizationBreakCalculationMode={organizationBreakCalculationMode}
          locations={locations}
        />

        <Card>
          <CardHeader>
            <CardTitle>How Break Rules Work</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              The system automatically calculates unpaid break time based on the rules you configure.
              Location-specific rules override organization defaults.
            </p>

            <div className="pt-2 border-t">
              <p className="font-medium text-foreground mb-2">Per Shift Mode (Default)</p>
              <p>
                Each shift is evaluated independently. If you set 3+ hours = 15 min and 6+ hours = 30 min:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>A 2-hour shift gets 0 min break</li>
                <li>A 4-hour shift gets 15 min break</li>
                <li>A 7-hour shift gets 30 min break</li>
              </ul>
            </div>

            <div className="pt-2 border-t">
              <p className="font-medium text-foreground mb-2">Per Day Mode</p>
              <p>
                All shifts for a staff member on the same day are summed, then break rules apply to the total.
                This is useful when staff work multiple short shifts that together qualify for a longer break.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>A 2-hour morning shift + 3-hour evening shift = 5 hours total</li>
                <li>With 5+ hours = 30 min rule, the day gets a 30 min break instead of 0+15</li>
              </ul>
            </div>

            <p className="pt-2 border-t">
              Break time is subtracted from shift duration when calculating paid hours on timesheets and exports.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
