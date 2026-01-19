"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Clock, Plus, Trash2 } from "lucide-react";

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  notes: string | null;
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function AvailabilityForm() {
  const router = useRouter();
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    notes: "",
  });

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const res = await fetch("/api/availability");
      if (res.ok) {
        const data = await res.json();
        setAvailability(data);
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: formData.dayOfWeek,
          startTime: formData.startTime,
          endTime: formData.endTime,
          notes: formData.notes || null,
          isRecurring: true,
        }),
      });
      if (res.ok) {
        setFormData({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", notes: "" });
        setShowForm(false);
        fetchAvailability();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create availability:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/availability?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAvailability();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete availability:", error);
    }
  };

  // Group availability by day
  const groupedByDay = DAYS.map((day) => ({
    ...day,
    slots: availability.filter((a) => a.dayOfWeek === day.value),
  }));

  if (loading) {
    return <div className="text-center py-4">Loading availability...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set your regular weekly availability so managers know when you can work.
      </p>

      <div className="space-y-3">
        {groupedByDay.map((day) => (
          <div key={day.value} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{day.label}</span>
              {day.slots.length === 0 && (
                <span className="text-xs text-muted-foreground">Not available</span>
              )}
            </div>
            {day.slots.length > 0 && (
              <div className="space-y-2">
                {day.slots.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      {slot.notes && (
                        <span className="text-xs text-muted-foreground">({slot.notes})</span>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(slot.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="day">Day</Label>
              <Select
                id="day"
                options={DAYS.map((d) => ({ value: d.value.toString(), label: d.label }))}
                value={formData.dayOfWeek.toString()}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
              />
            </div>
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
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="e.g., Prefer morning shifts"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Availability"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Availability
        </Button>
      )}
    </div>
  );
}
