"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Coffee } from "lucide-react";

interface User {
  id: string;
  name: string;
}

interface BreakRule {
  minHours: number;
  breakMinutes: number;
}

interface AddManualTimeEntryDialogProps {
  users: User[];
  breakRules: string;
}

function calculateBreakMinutes(hoursWorked: number, breakRulesJson: string): number {
  try {
    const rules: BreakRule[] = JSON.parse(breakRulesJson);
    const applicableRule = rules
      .filter((r) => hoursWorked >= r.minHours)
      .sort((a, b) => b.minHours - a.minHours)[0];
    return applicableRule?.breakMinutes || 0;
  } catch {
    return 0;
  }
}

export function AddManualTimeEntryDialog({ users, breakRules }: AddManualTimeEntryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    userId: "",
    date: new Date().toISOString().split("T")[0],
    clockInTime: "09:00",
    clockOutTime: "17:00",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      userId: "",
      date: new Date().toISOString().split("T")[0],
      clockInTime: "09:00",
      clockOutTime: "17:00",
      notes: "",
    });
    setError(null);
  };

  // Calculate gross hours worked (before break deduction)
  const grossHours = useMemo(() => {
    if (!formData.clockInTime || !formData.clockOutTime) return 0;

    const [inHours, inMins] = formData.clockInTime.split(":").map(Number);
    const [outHours, outMins] = formData.clockOutTime.split(":").map(Number);

    let totalMinutes = (outHours * 60 + outMins) - (inHours * 60 + inMins);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight

    return totalMinutes / 60;
  }, [formData.clockInTime, formData.clockOutTime]);

  // Auto-calculate break based on break rules
  const autoBreakMinutes = useMemo(() => {
    return calculateBreakMinutes(grossHours, breakRules);
  }, [grossHours, breakRules]);

  const handleSubmit = async () => {
    if (!formData.userId) {
      setError("Please select an employee");
      return;
    }
    if (!formData.date || !formData.clockInTime || !formData.clockOutTime) {
      setError("Please fill in all required fields");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Combine date and time into ISO strings
      const clockIn = new Date(`${formData.date}T${formData.clockInTime}:00`);
      const clockOut = new Date(`${formData.date}T${formData.clockOutTime}:00`);

      // Handle overnight shifts - if clock out is before clock in, add a day
      if (clockOut <= clockIn) {
        clockOut.setDate(clockOut.getDate() + 1);
      }

      const res = await fetch("/api/time-entries/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: formData.userId,
          clockIn: clockIn.toISOString(),
          clockOut: clockOut.toISOString(),
          totalBreak: autoBreakMinutes,
          notes: formData.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create time entry");
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create time entry");
    } finally {
      setSaving(false);
    }
  };

  const userOptions = users.map((user) => ({
    value: user.id,
    label: user.name,
  }));

  // Calculate net hours (after break deduction)
  const netHours = useMemo(() => {
    const netMinutes = Math.max(0, (grossHours * 60) - autoBreakMinutes);
    return (netMinutes / 60).toFixed(2);
  }, [grossHours, autoBreakMinutes]);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Manual Entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Manual Time Entry</DialogTitle>
          <DialogDescription>
            Create a time entry for an employee who forgot to clock in/out
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="userId">Employee *</Label>
            <Select
              id="userId"
              options={[{ value: "", label: "Select employee..." }, ...userOptions]}
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clockInTime">Clock In Time *</Label>
              <Input
                id="clockInTime"
                type="time"
                value={formData.clockInTime}
                onChange={(e) => setFormData({ ...formData, clockInTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clockOutTime">Clock Out Time *</Label>
              <Input
                id="clockOutTime"
                type="time"
                value={formData.clockOutTime}
                onChange={(e) => setFormData({ ...formData, clockOutTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Reason for manual entry..."
              rows={2}
            />
          </div>

          <div className="p-3 bg-muted rounded-md space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gross hours:</span>
              <span className="font-medium">{grossHours.toFixed(2)} hours</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Coffee className="h-3 w-3" />
                Break (auto):
              </span>
              <span className="font-medium">{autoBreakMinutes} minutes</span>
            </div>
            <div className="flex items-center justify-between text-sm border-t pt-2">
              <span className="text-muted-foreground font-medium">Net hours:</span>
              <span className="font-bold text-foreground">{netHours} hours</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
