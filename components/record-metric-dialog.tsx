"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Baby, Building2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
}

interface RecordMetricDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string | null;
  locations: Location[];
  onSuccess: () => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Users; color: string; metric: string }> = {
  MEMBERSHIP: { label: "Membership", icon: Users, color: "text-blue-600", metric: "Total Members" },
  KIDS_CLUB: { label: "Kids Club", icon: Baby, color: "text-pink-600", metric: "Total Kids Club Members" },
  EXTERNAL_GROUPS: { label: "External Groups", icon: Building2, color: "text-amber-600", metric: "Groups Booked This Week" },
};

const METRIC_TYPE_OPTIONS = [
  { value: "TOTAL", label: "Current Total" },
  { value: "NEW_THIS_WEEK", label: "New This Week" },
  { value: "LOST_THIS_WEEK", label: "Lost This Week" },
];

export function RecordMetricDialog({
  open,
  onOpenChange,
  category,
  locations,
  onSuccess,
}: RecordMetricDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    value: "",
    metricType: "TOTAL",
    locationId: "",
    notes: "",
  });

  const config = category ? CATEGORY_CONFIG[category] : null;
  const Icon = config?.icon || TrendingUp;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !formData.value) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/growth/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          metricType: formData.metricType,
          value: parseInt(formData.value) || 0,
          locationId: formData.locationId || null,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        onOpenChange(false);
        setFormData({ value: "", metricType: "TOTAL", locationId: "", notes: "" });
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to record metric");
      }
    } catch (err) {
      console.error("Failed to record metric:", err);
      setError("Failed to record metric. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const locationOptions = [
    { value: "", label: "Organization-wide" },
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config?.color)} />
            Record {config?.label} Metric
          </DialogTitle>
          <DialogDescription>
            Update the current {config?.metric?.toLowerCase() || "metric"} to track growth progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4 py-4">
            {/* Metric Type */}
            <div className="space-y-2">
              <Label htmlFor="metricType">Metric Type</Label>
              <Select
                id="metricType"
                options={METRIC_TYPE_OPTIONS}
                value={formData.metricType}
                onChange={(e) => setFormData({ ...formData, metricType: e.target.value })}
              />
            </div>

            {/* Value */}
            <div className="space-y-2">
              <Label htmlFor="value">
                {formData.metricType === "TOTAL" ? "Current Total" : "Number"}
              </Label>
              <Input
                id="value"
                type="number"
                min="0"
                placeholder={formData.metricType === "TOTAL" ? "e.g., 1250" : "e.g., 15"}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                {formData.metricType === "TOTAL"
                  ? `Enter the current total ${config?.metric?.toLowerCase() || "count"}`
                  : formData.metricType === "NEW_THIS_WEEK"
                  ? "Enter how many new members/bookings this week"
                  : "Enter how many lost/cancelled this week"}
              </p>
            </div>

            {/* Location */}
            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Select
                  id="location"
                  options={locationOptions}
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any context about this update..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.value}>
              {loading ? "Saving..." : "Record Metric"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
