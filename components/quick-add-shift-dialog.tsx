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

interface User {
  id: string;
  name: string;
  email: string;
}

interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
}

interface Shift {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  isOpen: boolean;
  scheduledBreakMinutes?: number;
  assignedTo: { id: string; name: string; email: string } | null;
  category?: ShiftCategory | null;
}

interface QuickAddShiftDialogProps {
  date: Date;
  userId: string | null;
  users: User[];
  locationId?: string | null;
  onClose: () => void;
  onShiftCreated?: (shift: Shift) => void;
  onShiftConfirmed?: (tempId: string, serverShift: Shift) => void;
  onShiftRollback?: (tempId: string) => void;
}

export function QuickAddShiftDialog({
  date,
  userId,
  users,
  locationId,
  onClose,
  onShiftCreated,
  onShiftConfirmed,
  onShiftRollback,
}: QuickAddShiftDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ShiftCategory[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    startTime: "09:00",
    endTime: "17:00",
    assignedToId: userId || "",
    categoryId: "",
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/shift-categories?activeOnly=true");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const dateStr = date.toISOString().split("T")[0];
    const startDateTime = new Date(`${dateStr}T${formData.startTime}`);
    const endDateTime = new Date(`${dateStr}T${formData.endTime}`);

    // Auto-generate title if empty
    const title = formData.title || `${formData.startTime.replace(":", "")} Shift`;

    // Find assigned user for optimistic update
    const assignedUser = formData.assignedToId
      ? users.find((u) => u.id === formData.assignedToId)
      : null;
    const selectedCategory = formData.categoryId
      ? categories.find((c) => c.id === formData.categoryId)
      : null;

    // Generate temp ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create optimistic shift
    const optimisticShift: Shift = {
      id: tempId,
      title,
      description: null,
      startTime: startDateTime,
      endTime: endDateTime,
      status: "SCHEDULED",
      isOpen: !formData.assignedToId,
      assignedTo: assignedUser
        ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email }
        : null,
      category: selectedCategory || null,
      scheduledBreakMinutes: 0,
    };

    // Add shift and close immediately
    onShiftCreated?.(optimisticShift);
    onClose();

    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          assignedToId: formData.assignedToId || null,
          categoryId: formData.categoryId || null,
          locationId: locationId || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onShiftConfirmed?.(tempId, {
          ...data,
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
        });
      } else {
        onShiftRollback?.(tempId);
        setError(data.error || "Failed to create shift");
      }
    } catch (error) {
      console.error("Failed to create shift:", error);
      onShiftRollback?.(tempId);
      setError("Failed to create shift");
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const userOptions = [
    { value: "", label: "Open Shift (Unassigned)" },
    ...users.map((user) => ({ value: user.id, label: user.name })),
  ];

  const categoryOptions = [
    { value: "", label: "No Category" },
    ...categories.map((cat) => ({
      value: cat.id,
      label: `${cat.name} ($${cat.hourlyRate.toFixed(2)}/hr)`,
    })),
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add Shift</DialogTitle>
          <DialogDescription>{formatDate(date)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {error && (
            <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive flex-shrink-0">
              {error}
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start</Label>
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
                <Label htmlFor="endTime">End</Label>
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
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assign To</Label>
              <Select
                id="assignedTo"
                options={userOptions}
                value={formData.assignedToId}
                onChange={(e) =>
                  setFormData({ ...formData, assignedToId: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                id="category"
                options={categoryOptions}
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="Auto-generated from time"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
