"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Clock, Plus, Trash2, Calendar } from "lucide-react";

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate: string | null;
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
  const [mode, setMode] = useState<"recurring" | "specific">("recurring");
  const [formData, setFormData] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    specificDate: "",
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
      const isRecurring = mode === "recurring";
      const payload: Record<string, unknown> = {
        startTime: formData.startTime,
        endTime: formData.endTime,
        notes: formData.notes || null,
        isRecurring,
      };

      if (isRecurring) {
        payload.dayOfWeek = formData.dayOfWeek;
      } else {
        // For date-specific, extract day of week from the date
        const date = new Date(formData.specificDate);
        payload.dayOfWeek = date.getDay();
        payload.specificDate = formData.specificDate;
      }

      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setFormData({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", specificDate: "", notes: "" });
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

  // Separate recurring and date-specific availability
  const recurringAvailability = availability.filter((a) => a.isRecurring);
  const specificAvailability = availability.filter((a) => !a.isRecurring);

  // Group recurring availability by day
  const groupedByDay = DAYS.map((day) => ({
    ...day,
    slots: recurringAvailability.filter((a) => a.dayOfWeek === day.value),
  }));

  // Sort date-specific by date
  const sortedSpecific = [...specificAvailability].sort((a, b) => {
    if (!a.specificDate || !b.specificDate) return 0;
    return new Date(a.specificDate).getTime() - new Date(b.specificDate).getTime();
  });

  if (loading) {
    return <div className="text-center py-4">Loading availability...</div>;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-6">
      {/* Regular Weekly Availability */}
      <div>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Regular Weekly Availability
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Your typical availability each week
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
      </div>

      {/* Date-Specific Availability */}
      <div>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Date-Specific Availability
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          One-time availability changes for specific dates
        </p>
        {sortedSpecific.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-lg p-3">No date-specific availability set</p>
        ) : (
          <div className="space-y-2">
            {sortedSpecific.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded px-3 py-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{slot.specificDate && formatDate(slot.specificDate)}</span>
                  <span className="text-sm text-muted-foreground">
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

      {/* Add Form */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
          {/* Mode Selector */}
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={mode === "recurring" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("recurring")}
            >
              <Clock className="h-4 w-4 mr-2" />
              Weekly Recurring
            </Button>
            <Button
              type="button"
              variant={mode === "specific" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("specific")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Specific Date
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {mode === "recurring" ? (
              <div className="space-y-2">
                <Label htmlFor="day">Day</Label>
                <Select
                  id="day"
                  options={DAYS.map((d) => ({ value: d.value.toString(), label: d.label }))}
                  value={formData.dayOfWeek.toString()}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="specificDate">Date</Label>
                <Input
                  id="specificDate"
                  type="date"
                  value={formData.specificDate}
                  onChange={(e) => setFormData({ ...formData, specificDate: e.target.value })}
                  required={mode === "specific"}
                />
              </div>
            )}
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
              placeholder={mode === "specific" ? "e.g., Doctor's appointment in afternoon" : "e.g., Prefer morning shifts"}
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
