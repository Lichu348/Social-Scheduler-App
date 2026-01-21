"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface MonthlyData {
  month: string;
  EQUIPMENT: number;
  SUPPLIES: number;
  MAINTENANCE: number;
  MARKETING: number;
  TRAINING: number;
  OTHER: number;
  total: number;
}

interface CategoryTotal {
  name: string;
  value: number;
  color: string;
}

interface SpendAnalyticsProps {
  monthlyData: MonthlyData[];
  categoryTotals: CategoryTotal[];
  currentMonth: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  EQUIPMENT: "#3b82f6",    // blue
  SUPPLIES: "#22c55e",     // green
  MAINTENANCE: "#f59e0b",  // amber
  MARKETING: "#8b5cf6",    // purple
  TRAINING: "#ec4899",     // pink
  OTHER: "#6b7280",        // gray
};

const CATEGORY_LABELS: Record<string, string> = {
  EQUIPMENT: "Equipment",
  SUPPLIES: "Supplies",
  MAINTENANCE: "Maintenance",
  MARKETING: "Marketing",
  TRAINING: "Training",
  OTHER: "Other",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SpendAnalytics({ monthlyData, categoryTotals, currentMonth }: SpendAnalyticsProps) {
  const totalSpend = categoryTotals.reduce((sum, cat) => sum + cat.value, 0);

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: entry.color }}
              />
              <span>{CATEGORY_LABELS[entry.name as keyof typeof CATEGORY_LABELS] || entry.name}:</span>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalSpend) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">{formatCurrency(data.value)}</p>
          <p className="text-xs text-muted-foreground">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Month-on-Month Spend by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spend by Category</CardTitle>
          <CardDescription>
            Approved spend over the last 6 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(value) => `£${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  formatter={(value) => CATEGORY_LABELS[value as keyof typeof CATEGORY_LABELS] || value}
                />
                <Bar dataKey="EQUIPMENT" stackId="a" fill={CATEGORY_COLORS.EQUIPMENT} />
                <Bar dataKey="SUPPLIES" stackId="a" fill={CATEGORY_COLORS.SUPPLIES} />
                <Bar dataKey="MAINTENANCE" stackId="a" fill={CATEGORY_COLORS.MAINTENANCE} />
                <Bar dataKey="MARKETING" stackId="a" fill={CATEGORY_COLORS.MARKETING} />
                <Bar dataKey="TRAINING" stackId="a" fill={CATEGORY_COLORS.TRAINING} />
                <Bar dataKey="OTHER" stackId="a" fill={CATEGORY_COLORS.OTHER} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No spend data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown for Current Period */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Spend Breakdown</CardTitle>
            <CardDescription>
              Distribution by category ({currentMonth})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryTotals.length > 0 && totalSpend > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryTotals}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryTotals.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">No approved spend this period</p>
              </div>
            )}
            <div className="text-center mt-2">
              <p className="text-2xl font-bold">{formatCurrency(totalSpend)}</p>
              <p className="text-sm text-muted-foreground">Total Approved</p>
            </div>
          </CardContent>
        </Card>

        {/* Category List */}
        <Card>
          <CardHeader>
            <CardTitle>Category Summary</CardTitle>
            <CardDescription>
              Approved spend by category ({currentMonth})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryTotals.length > 0 ? (
                categoryTotals
                  .sort((a, b) => b.value - a.value)
                  .map((category) => {
                    const percentage = totalSpend > 0
                      ? ((category.value / totalSpend) * 100).toFixed(1)
                      : 0;
                    return (
                      <div key={category.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold">{formatCurrency(category.value)}</span>
                            <Badge variant="outline" className="ml-2">
                              {percentage}%
                            </Badge>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: category.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No approved spend this period
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
