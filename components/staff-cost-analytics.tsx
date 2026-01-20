"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffCostTable } from "@/components/staff-cost-table";
import { TrendingUp, TrendingDown, Clock, PoundSterling, Palmtree, Building2 } from "lucide-react";

interface StaffCost {
  userId: string;
  name: string;
  paymentType: string;
  hours: number;
  grossPay: number;
  holidayAccrual: number;
  employeeNI: number;
  employerNI: number;
  totalCost: number;
}

interface LocationCost {
  locationId: string;
  locationName: string;
  hours: number;
  grossPay: number;
  holidayAccrual: number;
  employerNI: number;
  totalCost: number;
}

interface AnalyticsData {
  period: {
    month: string;
    startDate: string;
    endDate: string;
  };
  totals: {
    hours: number;
    grossPay: number;
    holidayAccrual: number;
    employeeNI: number;
    employerNI: number;
    totalCost: number;
  };
  variance: {
    amount: number;
    percentage: number;
    previousMonthTotal: number;
  };
  staff: StaffCost[];
  locations: LocationCost[];
  allLocations: Array<{ id: string; name: string }>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getMonthOptions() {
  const options = [];
  const now = new Date();

  // Generate last 12 months
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    options.push({ value, label });
  }

  return options;
}

export function StaffCostAnalytics() {
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locationOptions = useMemo(() => {
    const options = [{ value: "all", label: "All Locations" }];
    if (data?.allLocations) {
      data.allLocations.forEach((loc) => {
        options.push({ value: loc.id, label: loc.name });
      });
    }
    return options;
  }, [data?.allLocations]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ month: selectedMonth });
        if (selectedLocation !== "all") {
          params.append("locationId", selectedLocation);
        }

        const response = await fetch(`/api/analytics/staff-costs?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch analytics data");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedMonth, selectedLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const variancePositive = data.variance.amount > 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-[200px]">
          <Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            options={monthOptions}
          />
        </div>
        <div className="w-[200px]">
          <Select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            options={locationOptions}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totals.hours.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Pay</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totals.grossPay)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Holiday Accrual</CardTitle>
            <Palmtree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totals.holidayAccrual)}</div>
            <p className="text-xs text-muted-foreground">12.07% for hourly staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employee NI</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totals.employeeNI)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employer NI</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totals.employerNI)}</div>
            <p className="text-xs text-muted-foreground">13.8% above threshold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totals.totalCost)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Month-over-Month Variance</CardTitle>
          <CardDescription>
            Comparison with previous month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-2xl font-bold ${variancePositive ? "text-red-600" : "text-green-600"}`}>
              {variancePositive ? (
                <TrendingUp className="h-6 w-6" />
              ) : (
                <TrendingDown className="h-6 w-6" />
              )}
              {formatCurrency(Math.abs(data.variance.amount))}
              <span className="text-sm font-normal">
                ({variancePositive ? "+" : ""}{data.variance.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="text-muted-foreground">
              vs {formatCurrency(data.variance.previousMonthTotal)} previous month
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>
            Detailed view by staff member and location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="staff">
            <TabsList>
              <TabsTrigger value="staff">By Staff</TabsTrigger>
              <TabsTrigger value="location">By Location</TabsTrigger>
            </TabsList>

            <TabsContent value="staff">
              {data.staff.length > 0 ? (
                <StaffCostTable staff={data.staff} />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No approved time entries for this period
                </div>
              )}
            </TabsContent>

            <TabsContent value="location">
              {data.locations.length > 0 ? (
                <div className="space-y-4">
                  {data.locations.map((location) => (
                    <div key={location.locationId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{location.locationName}</h4>
                        <span className="text-lg font-bold">{formatCurrency(location.totalCost)}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="block font-medium text-foreground">{location.hours.toFixed(1)}</span>
                          Hours
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">{formatCurrency(location.grossPay)}</span>
                          Gross Pay
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">{formatCurrency(location.holidayAccrual)}</span>
                          Holiday Accrual
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">{formatCurrency(location.employerNI)}</span>
                          Employer NI
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No location data for this period
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
