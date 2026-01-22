import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, Users, MapPin, TrendingUp, Calendar } from "lucide-react";

interface LaborCostData {
  totalCost: number;
  totalHours: number;
  byLocation: {
    id: string;
    name: string;
    cost: number;
    hours: number;
  }[];
  byCategory: {
    id: string;
    name: string;
    color: string;
    cost: number;
    hours: number;
  }[];
  byDay: {
    date: string;
    dayName: string;
    cost: number;
    hours: number;
  }[];
}

async function getLaborCostData(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<LaborCostData> {
  // Get all shifts in the date range with their categories and locations
  const shifts = await prisma.shift.findMany({
    where: {
      organizationId,
      startTime: { gte: startDate },
      endTime: { lte: new Date(endDate.getTime() + 24 * 60 * 60 * 1000) },
      assignedToId: { not: null }, // Only assigned shifts count toward labor
    },
    include: {
      category: { select: { id: true, name: true, hourlyRate: true, color: true } },
      location: { select: { id: true, name: true } },
      assignedTo: { select: { id: true } },
    },
  });

  // Get user-specific category rates
  const userRates = await prisma.userCategoryRate.findMany({
    where: {
      user: { organizationId },
    },
    select: { userId: true, categoryId: true, hourlyRate: true },
  });

  // Build lookup map for user rates
  const userRateMap = new Map<string, number>();
  userRates.forEach((rate) => {
    userRateMap.set(`${rate.userId}-${rate.categoryId}`, rate.hourlyRate);
  });

  // Calculate totals
  let totalCost = 0;
  let totalHours = 0;
  const locationMap = new Map<string, { name: string; cost: number; hours: number }>();
  const categoryMap = new Map<string, { name: string; color: string; cost: number; hours: number }>();
  const dayMap = new Map<string, { dayName: string; cost: number; hours: number }>();

  shifts.forEach((shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const paidHours = hours - (shift.scheduledBreakMinutes || 0) / 60;

    // Get hourly rate (user-specific or category default)
    let hourlyRate = 0;
    if (shift.category) {
      const userKey = `${shift.assignedToId}-${shift.category.id}`;
      hourlyRate = userRateMap.get(userKey) || shift.category.hourlyRate;
    }

    const cost = paidHours * hourlyRate;
    totalCost += cost;
    totalHours += paidHours;

    // By location
    if (shift.location) {
      const loc = locationMap.get(shift.location.id) || {
        name: shift.location.name,
        cost: 0,
        hours: 0,
      };
      loc.cost += cost;
      loc.hours += paidHours;
      locationMap.set(shift.location.id, loc);
    }

    // By category
    if (shift.category) {
      const cat = categoryMap.get(shift.category.id) || {
        name: shift.category.name,
        color: shift.category.color,
        cost: 0,
        hours: 0,
      };
      cat.cost += cost;
      cat.hours += paidHours;
      categoryMap.set(shift.category.id, cat);
    }

    // By day
    const dateKey = start.toISOString().split("T")[0];
    const dayName = start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const day = dayMap.get(dateKey) || { dayName, cost: 0, hours: 0 };
    day.cost += cost;
    day.hours += paidHours;
    dayMap.set(dateKey, day);
  });

  return {
    totalCost,
    totalHours,
    byLocation: Array.from(locationMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.cost - a.cost),
    byCategory: Array.from(categoryMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.cost - a.cost),
    byDay: Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date: Date): Date {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function LaborCostsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  // Only managers/admins can view labor costs
  if (session.user.role === "EMPLOYEE") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const today = new Date();

  // Parse date params or use current week
  const startDate = params.start ? new Date(params.start) : getWeekStart(today);
  const endDate = params.end ? new Date(params.end) : getWeekEnd(today);

  const data = await getLaborCostData(
    session.user.organizationId,
    startDate,
    endDate
  );

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatHours = (hours: number) => `${hours.toFixed(1)}h`;

  const dateRangeStr = `${startDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })} - ${endDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <TrendingUp className="h-8 w-8" />
          Labor Cost Report
        </h1>
        <p className="text-muted-foreground mt-1">
          Review labor costs across locations and categories
        </p>
      </div>

      {/* Date Range Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Period:</span>
              <Badge variant="outline">{dateRangeStr}</Badge>
            </div>
            <div className="flex gap-2">
              <a
                href={`/dashboard/reports/labor-costs?start=${getWeekStart(today).toISOString().split("T")[0]}&end=${getWeekEnd(today).toISOString().split("T")[0]}`}
                className="px-3 py-1.5 text-sm rounded-md bg-muted hover:bg-muted/80 transition-colors"
              >
                This Week
              </a>
              <a
                href={`/dashboard/reports/labor-costs?start=${getWeekStart(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0]}&end=${getWeekEnd(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0]}`}
                className="px-3 py-1.5 text-sm rounded-md bg-muted hover:bg-muted/80 transition-colors"
              >
                Last Week
              </a>
              <a
                href={`/dashboard/reports/labor-costs?start=${new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]}&end=${new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0]}`}
                className="px-3 py-1.5 text-sm rounded-md bg-muted hover:bg-muted/80 transition-colors"
              >
                This Month
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Labor Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(data.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For {dateRangeStr}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatHours(data.totalHours)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Scheduled hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Hourly Cost</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.totalHours > 0
                ? formatCurrency(data.totalCost / data.totalHours)
                : "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average hourly rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Cost by Location
            </CardTitle>
            <CardDescription>Labor costs broken down by location</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byLocation.length > 0 ? (
              <div className="space-y-4">
                {data.byLocation.map((location) => (
                  <div key={location.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{location.name}</span>
                      <span className="text-green-600 font-semibold">
                        {formatCurrency(location.cost)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${(location.cost / data.totalCost) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {formatHours(location.hours)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No data for this period
              </p>
            )}
          </CardContent>
        </Card>

        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost by Category
            </CardTitle>
            <CardDescription>Labor costs broken down by shift category</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byCategory.length > 0 ? (
              <div className="space-y-4">
                {data.byCategory.map((category) => (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </span>
                      <span className="text-green-600 font-semibold">
                        {formatCurrency(category.cost)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(category.cost / data.totalCost) * 100}%`,
                            backgroundColor: category.color,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {formatHours(category.hours)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No data for this period
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Breakdown
          </CardTitle>
          <CardDescription>Labor costs for each day in the period</CardDescription>
        </CardHeader>
        <CardContent>
          {data.byDay.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-medium">Day</th>
                    <th className="text-right py-2 px-4 font-medium">Hours</th>
                    <th className="text-right py-2 px-4 font-medium">Cost</th>
                    <th className="text-right py-2 px-4 font-medium">Avg. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byDay.map((day) => (
                    <tr key={day.date} className="border-b last:border-b-0">
                      <td className="py-3 px-4">{day.dayName}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {formatHours(day.hours)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">
                        {formatCurrency(day.cost)}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {day.hours > 0
                          ? formatCurrency(day.cost / day.hours)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-semibold">
                    <td className="py-3 px-4">Total</td>
                    <td className="py-3 px-4 text-right">
                      {formatHours(data.totalHours)}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600">
                      {formatCurrency(data.totalCost)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {data.totalHours > 0
                        ? formatCurrency(data.totalCost / data.totalHours)
                        : "-"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No data for this period
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
