"use client";

import { useState, useEffect } from "react";
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

interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
}

interface Location {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface Shift {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  scheduledBreakMinutes?: number;
  assignedTo: { id: string; name: string } | null;
  category?: ShiftCategory | null;
  location?: Location | null;
}

interface EditShiftDialogProps {
  shift: Shift;
  users: User[];
  categories: ShiftCategory[];
  locations: Location[];
  onClose: () => void;
  onSave: () => void;
}

export function EditShiftDialog({
  shift,
  users,
  categories,
  locations,
  onClose,
  onSave,
}: EditShiftDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format dates for input fields
  const formatDateForInput = (date: Date) => {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  };

  const formatTimeForInput = (date: Date) => {
    const d = new Date(date);
    return d.toTimeString().slice(0, 5);
  };

  const [formData, setFormData] = useState({
    title: shift.title,
    description: shift.description || "",
    date: formatDateForInput(shift.startTime),
    startTime: formatTimeForInput(shift.startTime),
    endTime: formatTimeForInput(shift.endTime),
    assignedToId: shift.assignedTo?.id || "",
    categoryId: shift.category?.id || "",
    locationId: shift.location?.id || "",
    scheduledBreakMinutes: shift.scheduledBreakMinutes || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Build datetime strings
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      let endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      // Handle overnight shifts
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          assignedToId: formData.assignedToId || null,
          categoryId: formData.categoryId || null,
          locationId: formData.locationId || null,
          scheduledBreakMinutes: formData.scheduledBreakMinutes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update shift");
        return;
      }

      router.refresh();
      onSave();
    } catch (err) {
      setError("Failed to update shift");
    } finally {
      setLoading(false);
    }
  };

  const userOptions = [
    { value: "", label: "Unassigned (Open Shift)" },
    ...users.map((u) => ({ value: u.id, label: u.name })),
  ];

  const categoryOptions = [
    { value: "", label: "No Category" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const locationOptions = [
    { value: "", label: "No Location" },
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Shift</DialogTitle>
          <DialogDescription>
            Make changes to the shift details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Select
              id="assignedTo"
              options={userOptions}
              value={formData.assignedToId}
              onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select
              id="location"
              options={locationOptions}
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              options={categoryOptions}
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="break">Unpaid Break (minutes)</Label>
            <Input
              id="break"
              type="number"
              min="0"
              value={formData.scheduledBreakMinutes}
              onChange={(e) => setFormData({ ...formData, scheduledBreakMinutes: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
