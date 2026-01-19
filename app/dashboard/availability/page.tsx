import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AvailabilityForm } from "@/components/availability-form";

export default async function AvailabilityPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Availability</h1>
        <p className="text-muted-foreground mt-1">
          Set your regular weekly availability so managers know when you can work
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>
            Add your available hours for each day of the week. These will be used when creating the schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvailabilityForm />
        </CardContent>
      </Card>
    </div>
  );
}
