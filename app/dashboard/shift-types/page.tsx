import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShiftCategoriesManager } from "@/components/shift-categories-manager";

export default async function ShiftTypesPage() {
  const session = await auth();
  if (!session?.user) return null;

  // Only admins can manage shift types
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Shift Types</h1>
        <p className="text-muted-foreground mt-1">
          Manage shift categories, colors, and default pay rates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shift Categories</CardTitle>
          <CardDescription>
            Each shift type has a color for the calendar and a default hourly rate.
            Individual staff rates can be set on the Team page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShiftCategoriesManager />
        </CardContent>
      </Card>
    </div>
  );
}
