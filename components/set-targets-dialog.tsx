"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Baby, Building2, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
}

interface CategorySummary {
  category: string;
  targetActivities: number;
  metricTarget: number | null;
}

interface SetTargetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  weekStart: string;
  currentTargets: CategorySummary[];
  onSuccess: () => void;
}

const CATEGORIES = [
  { key: "MEMBERSHIP", label: "Membership", icon: Users, color: "text-blue-600" },
  { key: "KIDS_CLUB", label: "Kids Club", icon: Baby, color: "text-pink-600" },
  { key: "EXTERNAL_GROUPS", label: "External Groups", icon: Building2, color: "text-amber-600" },
];

export function SetTargetsDialog({
  open,
  onOpenChange,
  locations,
  weekStart,
  currentTargets,
  onSuccess,
}: SetTargetsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string>("");
  const [targets, setTargets] = useState<Record<string, { activityTarget: string; metricTarget: string }>>({
    MEMBERSHIP: { activityTarget: "", metricTarget: "" },
    KIDS_CLUB: { activityTarget: "", metricTarget: "" },
    EXTERNAL_GROUPS: { activityTarget: "", metricTarget: "" },
  });

  // Initialize with current targets
  useEffect(() => {
    const newTargets: Record<string, { activityTarget: string; metricTarget: string }> = {
      MEMBERSHIP: { activityTarget: "", metricTarget: "" },
      KIDS_CLUB: { activityTarget: "", metricTarget: "" },
      EXTERNAL_GROUPS: { activityTarget: "", metricTarget: "" },
    };

    currentTargets.forEach((t) => {
      if (newTargets[t.category]) {
        newTargets[t.category] = {
          activityTarget: t.targetActivities?.toString() || "",
          metricTarget: t.metricTarget?.toString() || "",
        };
      }
    });

    setTargets(newTargets);
  }, [currentTargets, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Save each category target
      const promises = CATEGORIES.map(async (cat) => {
        const target = targets[cat.key];
        if (target.activityTarget) {
          await fetch("/api/growth/targets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              weekStart,
              category: cat.key,
              activityTarget: parseInt(target.activityTarget) || 0,
              metricTarget: target.metricTarget ? parseInt(target.metricTarget) : null,
              locationId: locationId || null,
            }),
          });
        }
      });

      await Promise.all(promises);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Failed to save targets:", err);
      setError("Failed to save targets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const locationOptions = [
    { value: "", label: "All Locations (Organization-wide)" },
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  const weekDate = new Date(weekStart);
  const weekEndDate = new Date(weekDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekRange = `${weekDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${weekEndDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Set Weekly Targets
          </DialogTitle>
          <DialogDescription>
            Set activity targets for the week of {weekRange}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          <div className="space-y-6 py-4">
            {/* Location Selection */}
            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="targetLocation">Apply to Location</Label>
                <Select
                  id="targetLocation"
                  options={locationOptions}
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                />
              </div>
            )}

            {/* Category Targets */}
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.key} className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={cn("h-5 w-5", cat.color)} />
                    <span className="font-medium">{cat.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${cat.key}-activity`} className="text-xs">
                        Activity Target
                      </Label>
                      <Input
                        id={`${cat.key}-activity`}
                        type="number"
                        min="0"
                        placeholder="e.g., 10"
                        value={targets[cat.key].activityTarget}
                        onChange={(e) =>
                          setTargets({
                            ...targets,
                            [cat.key]: { ...targets[cat.key], activityTarget: e.target.value },
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">Activities to complete</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${cat.key}-metric`} className="text-xs">
                        Growth Target (optional)
                      </Label>
                      <Input
                        id={`${cat.key}-metric`}
                        type="number"
                        min="0"
                        placeholder="e.g., 500"
                        value={targets[cat.key].metricTarget}
                        onChange={(e) =>
                          setTargets({
                            ...targets,
                            [cat.key]: { ...targets[cat.key], metricTarget: e.target.value },
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">Target total number</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Targets"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
