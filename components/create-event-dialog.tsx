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
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarPlus } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface CreateEventDialogProps {
  locations?: Location[];
  defaultLocationId?: string | null;
}

const EVENT_TYPES = [
  { value: "PARTY", label: "Party", description: "Birthday parties, celebration events" },
  { value: "GROUP", label: "Group Booking", description: "School groups, corporate team building" },
  { value: "TRAINING", label: "Training", description: "Coaching sessions, youth team practice" },
  { value: "COMPETITION", label: "Competition", description: "Climbing competitions, leagues" },
  { value: "OTHER", label: "Other", description: "Miscellaneous events" },
];

export function CreateEventDialog({ locations = [], defaultLocationId }: CreateEventDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventType: "PARTY",
    date: "",
    startTime: "",
    endTime: "",
    expectedGuests: "",
    staffRequired: "",
    locationId: defaultLocationId || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          eventType: formData.eventType,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          expectedGuests: formData.expectedGuests || null,
          staffRequired: formData.staffRequired || null,
          locationId: formData.locationId || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setOpen(false);
        setFormData({
          title: "",
          description: "",
          eventType: "PARTY",
          date: "",
          startTime: "",
          endTime: "",
          expectedGuests: "",
          staffRequired: "",
          locationId: defaultLocationId || "",
        });
        router.refresh();
      } else {
        setError(data.error || "Failed to create event");
      }
    } catch (error) {
      console.error("Failed to create event:", error);
      setError("Failed to create event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const eventTypeOptions = EVENT_TYPES.map((type) => ({
    value: type.value,
    label: type.label,
  }));

  const locationOptions = [
    { value: "", label: "All Locations (Org-wide)" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarPlus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Add an event, party, or group booking to the schedule to help with staffing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive mb-4">
              {error}
            </div>
          )}
          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                placeholder="e.g., Birthday Party - Jake (10 kids)"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                id="eventType"
                options={eventTypeOptions}
                value={formData.eventType}
                onChange={(e) =>
                  setFormData({ ...formData, eventType: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                {EVENT_TYPES.find((t) => t.value === formData.eventType)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  id="location"
                  options={locationOptions}
                  value={formData.locationId}
                  onChange={(e) =>
                    setFormData({ ...formData, locationId: e.target.value })
                  }
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expectedGuests">Expected Guests</Label>
                <Input
                  id="expectedGuests"
                  type="number"
                  min="1"
                  placeholder="e.g., 25"
                  value={formData.expectedGuests}
                  onChange={(e) =>
                    setFormData({ ...formData, expectedGuests: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffRequired">Extra Staff Needed</Label>
                <Input
                  id="staffRequired"
                  type="number"
                  min="0"
                  placeholder="e.g., 2"
                  value={formData.staffRequired}
                  onChange={(e) =>
                    setFormData({ ...formData, staffRequired: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Any additional notes about the event..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
