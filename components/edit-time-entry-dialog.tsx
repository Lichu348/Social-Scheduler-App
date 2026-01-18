"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TimeEntry {
  id: string;
  clockIn: Date | string;
  clockOut: Date | string | null;
  notes: string | null;
  user: {
    id: string;
    name: string;
  };
}

interface EditTimeEntryDialogProps {
  entry: TimeEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateTimeLocal(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export function EditTimeEntryDialog({ entry, open, onOpenChange }: EditTimeEntryDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clockIn: formatDateTimeLocal(entry.clockIn),
    clockOut: formatDateTimeLocal(entry.clockOut),
    notes: entry.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate that clockOut is after clockIn if both are provided
      if (formData.clockIn && formData.clockOut) {
        const clockInDate = new Date(formData.clockIn);
        const clockOutDate = new Date(formData.clockOut);
        if (clockOutDate <= clockInDate) {
          setError("Clock out time must be after clock in time");
          setLoading(false);
          return;
        }
      }

      const res = await fetch(`/api/time-entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clockIn: formData.clockIn ? new Date(formData.clockIn).toISOString() : undefined,
          clockOut: formData.clockOut ? new Date(formData.clockOut).toISOString() : null,
          notes: formData.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update time entry");
      }

      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update time entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
          <DialogDescription>
            Modify the clock in/out times for {entry.user.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="clockIn">Clock In</Label>
              <Input
                id="clockIn"
                type="datetime-local"
                value={formData.clockIn}
                onChange={(e) =>
                  setFormData({ ...formData, clockIn: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clockOut">Clock Out</Label>
              <Input
                id="clockOut"
                type="datetime-local"
                value={formData.clockOut}
                onChange={(e) =>
                  setFormData({ ...formData, clockOut: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if still clocked in
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this time entry..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
