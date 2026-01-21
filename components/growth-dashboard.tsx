"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Users,
  Baby,
  Building2,
  TrendingUp,
  Target,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogActivityDialog } from "@/components/log-activity-dialog";
import { SetTargetsDialog } from "@/components/set-targets-dialog";
import { RecordMetricDialog } from "@/components/record-metric-dialog";

interface Location {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface CategorySummary {
  category: string;
  activitiesCompleted: number;
  targetActivities: number;
  pointsEarned: number;
  currentMetric: number | null;
  metricTarget: number | null;
  completionRate: number;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  activitiesCompleted: number;
  pointsEarned: number;
}

interface Activity {
  id: string;
  name: string;
  description: string | null;
  category: string;
  activityType: string;
  points: number;
  suggestedFreq: string;
}

interface RecentActivity {
  id: string;
  completedAt: string;
  notes: string | null;
  outcome: string;
  activity: {
    id: string;
    name: string;
    category: string;
    points: number;
  };
  completedBy: {
    id: string;
    name: string;
  };
}

interface DashboardData {
  weekStart: string;
  weekEnd: string;
  categorySummaries: CategorySummary[];
  leaderboard: LeaderboardEntry[];
  recentActivity: RecentActivity[];
  activities: Activity[];
}

interface GrowthDashboardProps {
  locations: Location[];
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
}

const CATEGORY_CONFIG = {
  MEMBERSHIP: {
    label: "Membership",
    icon: Users,
    color: "bg-blue-500",
    lightColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  KIDS_CLUB: {
    label: "Kids Club",
    icon: Baby,
    color: "bg-pink-500",
    lightColor: "bg-pink-50",
    textColor: "text-pink-700",
    borderColor: "border-pink-200",
  },
  EXTERNAL_GROUPS: {
    label: "External Groups",
    icon: Building2,
    color: "bg-amber-500",
    lightColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
};

export function GrowthDashboard({
  locations,
  users,
  currentUserId,
  isAdmin,
}: GrowthDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [locationId, setLocationId] = useState<string>("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [logActivityOpen, setLogActivityOpen] = useState(false);
  const [setTargetsOpen, setSetTargetsOpen] = useState(false);
  const [recordMetricOpen, setRecordMetricOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (locationId !== "all") params.set("locationId", locationId);
      params.set("weekOffset", weekOffset.toString());

      const res = await fetch(`/api/growth/dashboard?${params}`);
      if (res.ok) {
        const dashboardData = await res.json();
        setData(dashboardData);

        // Seed activities if none exist
        if (dashboardData.activities.length === 0) {
          await fetch("/api/growth/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seed: true }),
          });
          // Refetch after seeding
          const res2 = await fetch(`/api/growth/dashboard?${params}`);
          if (res2.ok) {
            setData(await res2.json());
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [locationId, weekOffset]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleLogActivity = () => {
    setLogActivityOpen(true);
  };

  const handleSetTargets = () => {
    setSetTargetsOpen(true);
  };

  const handleRecordMetric = (category: string) => {
    setSelectedCategory(category);
    setRecordMetricOpen(true);
  };

  const handleSuccess = () => {
    fetchDashboard();
    router.refresh();
  };

  const formatWeekRange = () => {
    if (!data) return "";
    const start = new Date(data.weekStart);
    const end = new Date(data.weekEnd);
    end.setDate(end.getDate() - 1); // End is exclusive
    const startStr = start.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const endStr = end.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return `${startStr} - ${endStr}`;
  };

  const locationOptions = [
    { value: "all", label: "All Locations" },
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading growth data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[160px] text-center">
              <div className="font-semibold">{formatWeekRange()}</div>
              <div className="text-xs text-muted-foreground">
                {weekOffset === 0 ? "This Week" : weekOffset === -1 ? "Last Week" : weekOffset > 0 ? "Future" : "Past"}
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                Today
              </Button>
            )}
          </div>

          {/* Location Filter */}
          {locations.length > 0 && (
            <Select
              options={locationOptions}
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-[180px]"
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleLogActivity}>
            <Plus className="h-4 w-4 mr-2" />
            Log Activity
          </Button>
          <Button variant="outline" onClick={handleSetTargets}>
            <Target className="h-4 w-4 mr-2" />
            Set Targets
          </Button>
        </div>
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data?.categorySummaries.map((summary) => {
          const config = CATEGORY_CONFIG[summary.category as keyof typeof CATEGORY_CONFIG];
          const Icon = config.icon;
          const progressPercent = Math.min(summary.completionRate, 100);

          return (
            <Card key={summary.category} className={cn("p-6", config.lightColor, config.borderColor, "border-2")}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-3 rounded-xl", config.color)}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{config.label}</h3>
                    <p className={cn("text-sm", config.textColor)}>
                      {summary.activitiesCompleted} / {summary.targetActivities || "?"} activities
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={config.textColor}
                  onClick={() => handleRecordMetric(summary.category)}
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-3 bg-white rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", config.color)}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>{summary.completionRate}% complete</span>
                  <span>{summary.pointsEarned} pts earned</span>
                </div>
              </div>

              {/* Current Metric */}
              <div className="flex items-center justify-between pt-4 border-t border-white/50">
                <div>
                  <p className="text-xs text-muted-foreground">Current Total</p>
                  <p className="text-2xl font-bold">{summary.currentMetric ?? "—"}</p>
                </div>
                {summary.metricTarget && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className="text-xl font-semibold text-muted-foreground">{summary.metricTarget}</p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Activity
            </h3>
            {data?.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No activities logged this week yet.</p>
                <p className="text-sm">Click "Log Activity" to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.recentActivity.map((activity) => {
                  const config = CATEGORY_CONFIG[activity.activity.category as keyof typeof CATEGORY_CONFIG];
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className={cn("w-2 h-2 rounded-full", config.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{activity.activity.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.completedBy.name} &middot;{" "}
                          {new Date(activity.completedAt).toLocaleString("en-GB", {
                            weekday: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-600">
                        <Zap className="h-4 w-4" />
                        <span className="text-sm font-medium">+{activity.activity.points}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Leaderboard */}
        <div>
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              This Week's Leaderboard
            </h3>
            {data?.leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No points earned yet this week.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.leaderboard.map((entry, index) => (
                  <div
                    key={entry.userId}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      index === 0 && "bg-amber-50 border border-amber-200",
                      index === 1 && "bg-gray-50",
                      index === 2 && "bg-orange-50/50",
                      index > 2 && "bg-muted/30"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                        index === 0 && "bg-amber-500 text-white",
                        index === 1 && "bg-gray-400 text-white",
                        index === 2 && "bg-orange-400 text-white",
                        index > 2 && "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {entry.name}
                        {entry.userId === currentUserId && (
                          <span className="text-muted-foreground ml-1">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.activitiesCompleted} activities
                      </p>
                    </div>
                    <div className="font-bold text-amber-600">{entry.pointsEarned} pts</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <LogActivityDialog
        open={logActivityOpen}
        onOpenChange={setLogActivityOpen}
        activities={data?.activities || []}
        locations={locations}
        onSuccess={handleSuccess}
      />

      <SetTargetsDialog
        open={setTargetsOpen}
        onOpenChange={setSetTargetsOpen}
        locations={locations}
        weekStart={data?.weekStart || new Date().toISOString()}
        currentTargets={data?.categorySummaries || []}
        onSuccess={handleSuccess}
      />

      <RecordMetricDialog
        open={recordMetricOpen}
        onOpenChange={setRecordMetricOpen}
        category={selectedCategory}
        locations={locations}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
