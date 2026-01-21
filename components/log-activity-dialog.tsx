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
import { Users, Baby, Building2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  name: string;
  description: string | null;
  category: string;
  activityType: string;
  points: number;
}

interface Location {
  id: string;
  name: string;
}

interface LogActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  locations: Location[];
  onSuccess: () => void;
}

const CATEGORY_CONFIG = {
  MEMBERSHIP: { label: "Membership", icon: Users, color: "text-blue-600" },
  KIDS_CLUB: { label: "Kids Club", icon: Baby, color: "text-pink-600" },
  EXTERNAL_GROUPS: { label: "External Groups", icon: Building2, color: "text-amber-600" },
};

const OUTCOME_OPTIONS = [
  { value: "COMPLETED", label: "Completed" },
  { value: "SUCCESSFUL", label: "Successful (positive response)" },
  { value: "NO_ANSWER", label: "No answer" },
  { value: "FOLLOW_UP_NEEDED", label: "Follow-up needed" },
  { value: "NOT_INTERESTED", label: "Not interested" },
];

export function LogActivityDialog({
  open,
  onOpenChange,
  activities,
  locations,
  onSuccess,
}: LogActivityDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("MEMBERSHIP");
  const [formData, setFormData] = useState({
    activityId: "",
    notes: "",
    outcome: "COMPLETED",
    contactName: "",
    contactInfo: "",
    followUpDate: "",
    locationId: "",
  });

  const filteredActivities = activities.filter((a) => a.category === selectedCategory);
  const selectedActivity = activities.find((a) => a.id === formData.activityId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/growth/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: formData.activityId,
          notes: formData.notes || null,
          outcome: formData.outcome,
          contactName: formData.contactName || null,
          contactInfo: formData.contactInfo || null,
          followUpDate: formData.followUpDate || null,
          locationId: formData.locationId || null,
        }),
      });

      if (res.ok) {
        onOpenChange(false);
        setFormData({
          activityId: "",
          notes: "",
          outcome: "COMPLETED",
          contactName: "",
          contactInfo: "",
          followUpDate: "",
          locationId: "",
        });
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to log activity");
      }
    } catch (err) {
      console.error("Failed to log activity:", err);
      setError("Failed to log activity. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const activityOptions = [
    { value: "", label: "Select an activity..." },
    ...filteredActivities.map((a) => ({
      value: a.id,
      label: `${a.name} (+${a.points} pts)`,
    })),
  ];

  const locationOptions = [
    { value: "", label: "No specific location" },
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Growth Activity</DialogTitle>
          <DialogDescription>
            Record a completed activity to earn points and track progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(key);
                        setFormData({ ...formData, activityId: "" });
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                        selectedCategory === key
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", config.color)} />
                      <span className="text-xs font-medium">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Activity Selection */}
            <div className="space-y-2">
              <Label htmlFor="activity">Activity</Label>
              <Select
                id="activity"
                options={activityOptions}
                value={formData.activityId}
                onChange={(e) => setFormData({ ...formData, activityId: e.target.value })}
                required
              />
              {selectedActivity?.description && (
                <p className="text-xs text-muted-foreground">{selectedActivity.description}</p>
              )}
              {selectedActivity && (
                <div className="flex items-center gap-1 text-amber-600 text-sm">
                  <Zap className="h-4 w-4" />
                  <span>+{selectedActivity.points} points</span>
                </div>
              )}
            </div>

            {/* Outcome */}
            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Select
                id="outcome"
                options={OUTCOME_OPTIONS}
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
              />
            </div>

            {/* Contact Details (optional) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name (optional)</Label>
                <Input
                  id="contactName"
                  placeholder="e.g., John Smith"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactInfo">Email/Phone (optional)</Label>
                <Input
                  id="contactInfo"
                  placeholder="e.g., john@email.com"
                  value={formData.contactInfo}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                />
              </div>
            </div>

            {/* Follow-up Date */}
            {formData.outcome === "FOLLOW_UP_NEEDED" && (
              <div className="space-y-2">
                <Label htmlFor="followUpDate">Follow-up Date</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                />
              </div>
            )}

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
                placeholder="Any details about what happened..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.activityId}>
              {loading ? "Logging..." : "Log Activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
