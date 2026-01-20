import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffCostAnalytics } from "@/components/staff-cost-analytics";

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Only managers and admins can access analytics
  if (session.user.role === "EMPLOYEE") {
    redirect("/dashboard");
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Staff Cost Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Monthly cost forecasts with UK payroll calculations
        </p>
      </div>

      <StaffCostAnalytics />
    </div>
  );
}
