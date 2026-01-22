"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, DollarSign, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForecastData {
  weekStart: string;
  weekEnd: string;
  contracted: {
    totalHours: number;
    totalCost: number;
    staffCount: number;
  };
  scheduled: {
    totalHours: number;
    totalCost: number;
    shiftCount: number;
  };
  variance: {
    hours: number;
    cost: number;
    hoursPercent: number;
    costPercent: number;
  };
}

interface WeeklyForecastCardProps {
  weekStart?: Date;
  locationId?: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function WeeklyForecastCard({ weekStart, locationId }: WeeklyForecastCardProps) {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (weekStart) {
          params.set("weekStart", weekStart.toISOString().split("T")[0]);
        }
        if (locationId) {
          params.set("locationId", locationId);
        }

        const res = await fetch(`/api/analytics/weekly-forecast?${params}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch forecast");
        }

        const data = await res.json();
        setForecast(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load forecast");
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [weekStart, locationId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weekly Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !forecast) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weekly Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || "No data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { contracted, scheduled, variance } = forecast;
  const hasContractedData = contracted.staffCount > 0;

  // Determine trend indicator
  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = (value: number, isOverBad: boolean = true) => {
    if (value === 0) return "text-gray-500";
    const isPositive = value > 0;
    if (isOverBad) {
      return isPositive ? "text-amber-600" : "text-green-600";
    }
    return isPositive ? "text-green-600" : "text-amber-600";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Weekly Forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Contracted */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Contracted</p>
            <p className="text-lg font-bold">
              {hasContractedData ? formatCurrency(contracted.totalCost) : "—"}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {hasContractedData ? `${contracted.totalHours}h` : "No contracts set"}
            </div>
          </div>

          {/* Scheduled */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Scheduled</p>
            <p className="text-lg font-bold">{formatCurrency(scheduled.totalCost)}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {scheduled.totalHours}h ({scheduled.shiftCount} shifts)
            </div>
          </div>
        </div>

        {/* Variance */}
        {hasContractedData && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Variance</span>
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                getTrendColor(variance.cost)
              )}>
                {getTrendIcon(variance.cost)}
                {variance.cost >= 0 ? "+" : ""}{formatCurrency(variance.cost)}
                <span className="text-xs">
                  ({variance.costPercent >= 0 ? "+" : ""}{variance.costPercent}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">Hours</span>
              <div className={cn(
                "flex items-center gap-1 text-xs",
                getTrendColor(variance.hours)
              )}>
                {variance.hours >= 0 ? "+" : ""}{variance.hours}h vs contracted
              </div>
            </div>
          </div>
        )}

        {!hasContractedData && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Set contracted hours for staff to see cost forecasts
          </p>
        )}
      </CardContent>
    </Card>
  );
}
