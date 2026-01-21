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
import { Cake, Users, GraduationCap, Trophy, CalendarDays, MapPin, Clock, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  startTime: string;
  endTime: string;
  expectedGuests: number | null;
  staffRequired: number | null;
  color: string;
  location: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
}

interface EventDetailDialogProps {
  event: Event;
  isManager: boolean;
  locations?: Location[];
  onClose: () => void;
}

const EVENT_TYPES = [
  { value: "PARTY", label: "Party", icon: Cake },
  { value: "GROUP", label: "Group Booking", icon: Users },
  { value: "TRAINING", label: "Training", icon: GraduationCap },
  { value: "COMPETITION", label: "Competition", icon: Trophy },
  { value: "OTHER", label: "Other", icon: CalendarDays },
];

export function EventDetailDialog({
  event,
  isManager,
  locations = [],
  onClose,
}: EventDetailDialogProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Parse start/end times for edit form
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);
  const dateStr = startDate.toISOString().split("T")[0];
  const startTimeStr = startDate.toTimeString().slice(0, 5);
  const endTimeStr = endDate.toTimeString().slice(0, 5);

  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description || "",
    eventType: event.eventType,
    date: dateStr,
    startTime: startTimeStr,
    endTime: endTimeStr,
    expectedGuests: event.expectedGuests?.toString() || "",
    staffRequired: event.staffRequired?.toString() || "",
    locationId: event.location?.id || "",
  });

  const eventTypeInfo = EVENT_TYPES.find((t) => t.value === event.eventType) || EVENT_TYPES[4];
  const EventIcon = eventTypeInfo.icon;

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
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
        setIsEditing(false);
        router.refresh();
        onClose();
      } else {
        setError(data.error || "Failed to update event");
      }
    } catch (error) {
      console.error("Failed to update event:", error);
      setError("Failed to update event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete event");
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
      setError("Failed to delete event. Please try again.");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
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
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: event.color }}
              >
                <EventIcon className="h-4 w-4 text-white" />
              </div>
              {isEditing ? "Edit Event" : event.title}
            </DialogTitle>
            {!isEditing && (
              <DialogDescription>
                {eventTypeInfo.label}
                {event.location && ` at ${event.location.name}`}
              </DialogDescription>
            )}
          </DialogHeader>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {error}
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Event Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-eventType">Event Type</Label>
                <Select
                  id="edit-eventType"
                  options={eventTypeOptions}
                  value={formData.eventType}
                  onChange={(e) =>
                    setFormData({ ...formData, eventType: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
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
                  <Label htmlFor="edit-startTime">Start Time</Label>
                  <Input
                    id="edit-startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endTime">End Time</Label>
                  <Input
                    id="edit-endTime"
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
                  <Label htmlFor="edit-location">Location</Label>
                  <Select
                    id="edit-location"
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
                  <Label htmlFor="edit-expectedGuests">Expected Guests</Label>
                  <Input
                    id="edit-expectedGuests"
                    type="number"
                    min="1"
                    value={formData.expectedGuests}
                    onChange={(e) =>
                      setFormData({ ...formData, expectedGuests: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-staffRequired">Extra Staff Needed</Label>
                  <Input
                    id="edit-staffRequired"
                    type="number"
                    min="0"
                    value={formData.staffRequired}
                    onChange={(e) =>
                      setFormData({ ...formData, staffRequired: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatTime(startDate)} - {formatTime(endDate)}
                </span>
                <span className="text-muted-foreground">
                  on {startDate.toLocaleDateString("en-GB", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              {event.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location.name}</span>
                </div>
              )}

              <div className="flex gap-4">
                {event.expectedGuests && (
                  <div className="flex items-center gap-2 text-sm bg-muted px-3 py-2 rounded-md">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{event.expectedGuests} expected guests</span>
                  </div>
                )}
                {event.staffRequired && (
                  <div className="flex items-center gap-2 text-sm bg-muted px-3 py-2 rounded-md">
                    <span>+{event.staffRequired} extra staff needed</span>
                  </div>
                )}
              </div>

              {event.description && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
              )}

              {event.createdBy && (
                <div className="text-xs text-muted-foreground">
                  Created by {event.createdBy.name}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                {isManager && (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
                <Button type="button" onClick={onClose}>
                  Close
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Event
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{event.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
