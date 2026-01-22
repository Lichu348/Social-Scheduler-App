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
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

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

interface ShiftSegment {
  id?: string;
  startTime: string; // HH:MM format for input
  endTime: string;
  categoryId: string;
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
  const [showSegments, setShowSegments] = useState(false);
  const [segments, setSegments] = useState<ShiftSegment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);

  // Load existing segments when dialog opens
  useEffect(() => {
    const fetchSegments = async () => {
      setLoadingSegments(true);
      try {
        const res = await fetch(`/api/shifts/${shift.id}/segments`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setShowSegments(true);
            setSegments(data.map((seg: { id: string; startTime: string; endTime: string; categoryId: string }) => ({
              id: seg.id,
              startTime: new Date(seg.startTime).toTimeString().slice(0, 5),
              endTime: new Date(seg.endTime).toTimeString().slice(0, 5),
              categoryId: seg.categoryId,
            })));
          }
        }
      } catch (err) {
        console.error("Failed to load segments:", err);
      } finally {
        setLoadingSegments(false);
      }
    };
    fetchSegments();
  }, [shift.id]);

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

      // Save segments if any are defined
      if (showSegments && segments.length > 0) {
        const segmentsToSave = segments.map((seg) => ({
          startTime: new Date(`${formData.date}T${seg.startTime}`).toISOString(),
          endTime: new Date(`${formData.date}T${seg.endTime}`).toISOString(),
          categoryId: seg.categoryId,
        }));

        const segRes = await fetch(`/api/shifts/${shift.id}/segments`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments: segmentsToSave }),
        });

        if (!segRes.ok) {
          const data = await segRes.json();
          setError(data.error || "Failed to save shift segments");
          return;
        }
      } else if (!showSegments) {
        // Clear segments if split shift is disabled
        await fetch(`/api/shifts/${shift.id}/segments`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments: [] }),
        });
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

  const addSegment = () => {
    const lastSegment = segments[segments.length - 1];
    const newStartTime = lastSegment ? lastSegment.endTime : formData.startTime;
    setSegments([
      ...segments,
      {
        startTime: newStartTime,
        endTime: formData.endTime,
        categoryId: categories[0]?.id || "",
      },
    ]);
  };

  const removeSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const updateSegment = (index: number, field: keyof ShiftSegment, value: string) => {
    const updated = [...segments];
    updated[index] = { ...updated[index], [field]: value };
    setSegments(updated);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Shift</DialogTitle>
          <DialogDescription>
            Make changes to the shift details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              disabled={showSegments && segments.length > 0}
            />
            {showSegments && segments.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Using split categories below instead
              </p>
            )}
          </div>

          {/* Split Shift Segments */}
          <div className="border rounded-lg p-3 space-y-3">
            <button
              type="button"
              className="flex items-center justify-between w-full text-sm font-medium"
              onClick={() => setShowSegments(!showSegments)}
            >
              <span>Split Shift by Category</span>
              {showSegments ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showSegments && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Define time segments with different categories (e.g., CRM 9-13, DM 13-17)
                </p>

                {loadingSegments ? (
                  <p className="text-sm text-muted-foreground">Loading segments...</p>
                ) : (
                  <>
                    {segments.map((segment, index) => (
                      <div key={index} className="flex items-end gap-2 p-2 bg-muted/50 rounded">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Start</Label>
                          <Input
                            type="time"
                            value={segment.startTime}
                            onChange={(e) => updateSegment(index, "startTime", e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">End</Label>
                          <Input
                            type="time"
                            value={segment.endTime}
                            onChange={(e) => updateSegment(index, "endTime", e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Category</Label>
                          <Select
                            options={categories.map((c) => ({ value: c.id, label: c.name }))}
                            value={segment.categoryId}
                            onChange={(e) => updateSegment(index, "categoryId", e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeSegment(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSegment}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Segment
                    </Button>
                  </>
                )}
              </div>
            )}
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
          </div>

          <DialogFooter className="flex-shrink-0 pt-4">
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
