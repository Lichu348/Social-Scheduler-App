"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import { MaintenanceCheckForm } from "@/components/maintenance-check-form";

interface CheckType {
  id: string;
  name: string;
  frequencyDays: number;
}

interface Location {
  id: string;
  name: string;
}

interface CheckStatus {
  checkTypeId: string;
  checkTypeName: string;
  frequencyDays: number;
  status: "completed" | "due" | "overdue" | "not_due";
  todayLog: {
    id: string;
    status: string;
    notes: string | null;
    signature: string;
    signedBy: { id: string; name: string };
    signedAt: string;
  } | null;
  lastLog: {
    id: string;
    checkDate: string;
    status: string;
  } | null;
  daysSinceLastCheck: number | null;
}

interface LocationCheckStatus {
  locationId: string;
  locationName: string;
  checks: CheckStatus[];
}

interface OverviewData {
  summary: {
    totalChecks: number;
    completedToday: number;
    dueToday: number;
    overdueChecks: number;
    openIssues: number;
  };
  checkTypes: CheckType[];
  locations: Location[];
  locationCheckStatus: LocationCheckStatus[];
  recentIssues: Array<{
    id: string;
    status: string;
    notes: string | null;
    checkDate: string;
    checkType: { name: string };
    location: { name: string };
    signedBy: { name: string };
  }>;
}

interface MaintenanceOverviewProps {
  userName: string;
}

export function MaintenanceOverview({ userName }: MaintenanceOverviewProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [loggingCheck, setLoggingCheck] = useState<{
    checkType: CheckType;
    location: Location;
  } | null>(null);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/maintenance/overview");
      if (res.ok) {
        const overview = await res.json();
        setData(overview);
        // Auto-expand locations with due checks
        const locationsWithDueChecks = new Set<string>();
        overview.locationCheckStatus.forEach((loc: LocationCheckStatus) => {
          if (loc.checks.some((c) => c.status === "due" || c.status === "overdue")) {
            locationsWithDueChecks.add(loc.locationId);
          }
        });
        setExpandedLocations(locationsWithDueChecks);
      }
    } catch (error) {
      console.error("Failed to fetch overview:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLocation = (locationId: string) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  };

  const handleCheckComplete = () => {
    setLoggingCheck(null);
    fetchOverview();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Done
          </Badge>
        );
      case "due":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            <Clock className="h-3 w-3 mr-1" />
            Due
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Not Due
          </Badge>
        );
    }
  };

  const getLogStatusBadge = (status: string) => {
    switch (status) {
      case "PASS":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Pass
          </Badge>
        );
      case "FAIL":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Fail
          </Badge>
        );
      case "NEEDS_ATTENTION":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            Needs Attention
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load maintenance data
      </div>
    );
  }

  if (data.checkTypes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No check types configured</p>
          <p className="text-sm mt-1">
            Ask an admin to configure check types in the &quot;Check Types&quot; tab
          </p>
        </CardContent>
      </Card>
    );
  }

  if (data.locations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No locations configured</p>
          <p className="text-sm mt-1">
            Add locations before logging maintenance checks
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Checks Due Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.dueToday}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.summary.completedToday}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              data.summary.overdueChecks > 0 ? "text-red-600" : ""
            )}>
              {data.summary.overdueChecks}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Issues (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              data.summary.openIssues > 0 ? "text-amber-600" : ""
            )}>
              {data.summary.openIssues}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Check Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Checks by Location</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {data.locationCheckStatus.map((loc) => {
              const isExpanded = expandedLocations.has(loc.locationId);
              const completedCount = loc.checks.filter((c) => c.status === "completed").length;
              const dueCount = loc.checks.filter((c) => c.status === "due" || c.status === "overdue").length;
              const hasOverdue = loc.checks.some((c) => c.status === "overdue");

              return (
                <div key={loc.locationId}>
                  <button
                    onClick={() => toggleLocation(loc.locationId)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left",
                      hasOverdue && "bg-red-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{loc.locationName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasOverdue && (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          {loc.checks.filter((c) => c.status === "overdue").length} Overdue
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {completedCount}/{loc.checks.length} done
                        {dueCount > 0 && `, ${dueCount} due`}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-muted/20">
                      <div className="space-y-2 pt-2">
                        {loc.checks.map((check) => (
                          <div
                            key={check.checkTypeId}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg bg-background border",
                              check.status === "overdue" && "border-red-200 bg-red-50/50"
                            )}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{check.checkTypeName}</span>
                                <span className="text-xs text-muted-foreground">
                                  (every {check.frequencyDays === 1 ? "day" : `${check.frequencyDays} days`})
                                </span>
                              </div>
                              {check.todayLog && (
                                <div className="mt-1 text-sm text-muted-foreground">
                                  Signed by {check.todayLog.signedBy.name} at{" "}
                                  {new Date(check.todayLog.signedAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                  {check.todayLog.notes && (
                                    <span className="ml-2">- {check.todayLog.notes}</span>
                                  )}
                                </div>
                              )}
                              {!check.todayLog && check.lastLog && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Last checked: {new Date(check.lastLog.checkDate).toLocaleDateString()}
                                  {check.daysSinceLastCheck !== null && (
                                    <span> ({check.daysSinceLastCheck} days ago)</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {check.todayLog && getLogStatusBadge(check.todayLog.status)}
                              {getStatusBadge(check.status)}
                              {check.status !== "completed" && check.status !== "not_due" && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setLoggingCheck({
                                      checkType: {
                                        id: check.checkTypeId,
                                        name: check.checkTypeName,
                                        frequencyDays: check.frequencyDays,
                                      },
                                      location: {
                                        id: loc.locationId,
                                        name: loc.locationName,
                                      },
                                    })
                                  }
                                >
                                  Log Check
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Issues */}
      {data.recentIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Recent Issues (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/50 border-amber-200"
                >
                  <div>
                    <div className="font-medium">
                      {issue.checkType.name} at {issue.location.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(issue.checkDate).toLocaleDateString()} by {issue.signedBy.name}
                      {issue.notes && <span> - {issue.notes}</span>}
                    </div>
                  </div>
                  {getLogStatusBadge(issue.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Check Dialog */}
      {loggingCheck && (
        <MaintenanceCheckForm
          checkType={loggingCheck.checkType}
          location={loggingCheck.location}
          userName={userName}
          onClose={() => setLoggingCheck(null)}
          onComplete={handleCheckComplete}
        />
      )}
    </div>
  );
}
