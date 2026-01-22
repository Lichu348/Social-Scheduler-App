"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

interface Location {
  id: string;
  name: string;
}

interface QuickAddEventDialogProps {
  date: Date;
  locationId?: string | null;
  locations?: Location[];
  onClose: () => void;
}

const EVENT_TYPES = [
  { value: "PARTY", label: "Party" },
  { value: "GROUP", label: "Group Booking" },
  { value: "TRAINING", label: "Training" },
  { value: "COMPETITION", label: "Competition" },
  { value: "OTHER", label: "Other" },
];

export function QuickAddEventDialog({
  date,
  locationId,
  locations = [],
  onClose,
}: QuickAddEventDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventType: "PARTY",
    startTime: "10:00",
    endTime: "12:00",
    expectedGuests: "",
    staffRequired: "",
    locationId: locationId || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const dateStr = date.toISOString().split("T")[0];
      const startDateTime = new Date(`${dateStr}T${formData.startTime}`);
      const endDateTime = new Date(`${dateStr}T${formData.endTime}`);

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          eventType: formData.eventType,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          expectedGuests: formData.expectedGuests ? parseInt(formData.expectedGuests) : null,
          staffRequired: formData.staffRequired ? parseInt(formData.staffRequired) : null,
          locationId: formData.locationId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create event");
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (d: Date) => {
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Event</DialogTitle>
          <DialogDescription>
            Create a new event for {formatDateForDisplay(date)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Birthday Party - Sarah"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                options={EVENT_TYPES}
              />
            </div>

            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
                  placeholder="Select location"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedGuests">Expected Guests</Label>
              <Input
                id="expectedGuests"
                type="number"
                min="1"
                value={formData.expectedGuests}
                onChange={(e) => setFormData({ ...formData, expectedGuests: e.target.value })}
                placeholder="e.g., 15"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffRequired">Extra Staff Needed</Label>
              <Input
                id="staffRequired"
                type="number"
                min="0"
                value={formData.staffRequired}
                onChange={(e) => setFormData({ ...formData, staffRequired: e.target.value })}
                placeholder="e.g., 2"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Notes (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Any additional details..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
