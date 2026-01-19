import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BreakRulesEditor } from "@/components/break-rules-editor";

async function getBreakRulesData(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { breakRules: true },
  });

  return { breakRules: organization?.breakRules || "[]" };
}

export default async function BreakRulesPage() {
  const session = await auth();
  if (!session?.user) return null;

  // Only admins can access
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { breakRules } = await getBreakRulesData(session.user.organizationId);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Break Rules</h1>
        <p className="text-muted-foreground mt-1">
          Configure automatic unpaid break times based on shift duration
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Automatic Break Configuration</CardTitle>
            <CardDescription>
              Set how many minutes of unpaid break are automatically assigned to shifts based on their length.
              Staff will see these breaks displayed on their schedule.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BreakRulesEditor breakRules={breakRules} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How Break Rules Work</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              When a shift is created, the system automatically calculates the unpaid break time based on
              the rules you configure here. The break with the highest qualifying threshold is applied.
            </p>
            <p>
              <strong>Example:</strong> If you set 3+ hours = 15 min and 6+ hours = 30 min, then:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>A 2-hour shift gets 0 min break</li>
              <li>A 4-hour shift gets 15 min break (matches 3+ hours rule)</li>
              <li>A 7-hour shift gets 30 min break (matches 6+ hours rule)</li>
              <li>An 8-hour shift gets 30 min break (matches 6+ hours rule)</li>
            </ul>
            <p className="pt-2">
              Break time is subtracted from shift duration when calculating paid hours on timesheets and exports.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
