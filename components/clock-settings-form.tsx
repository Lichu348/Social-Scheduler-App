"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClockSettingsFormProps {
  clockInWindowMinutes: number;
  clockOutGraceMinutes: number;
  shiftReminderHours: number;
}

export function ClockSettingsForm({
  clockInWindowMinutes,
  clockOutGraceMinutes,
  shiftReminderHours,
}: ClockSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    clockInWindowMinutes,
    clockOutGraceMinutes,
    shiftReminderHours,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSuccess(true);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update clock settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
          Clock settings updated successfully
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="clockInWindow">Clock-In Window (minutes before shift)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="clockInWindow"
              type="number"
              min="0"
              max="120"
              value={formData.clockInWindowMinutes}
              onChange={(e) =>
                setFormData({ ...formData, clockInWindowMinutes: parseInt(e.target.value) || 0 })
              }
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Employees can clock in up to this many minutes before their shift starts
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clockOutGrace">Clock-Out Grace Period (minutes after shift)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="clockOutGrace"
              type="number"
              min="0"
              max="120"
              value={formData.clockOutGraceMinutes}
              onChange={(e) =>
                setFormData({ ...formData, clockOutGraceMinutes: parseInt(e.target.value) || 0 })
              }
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Employees can clock out up to this many minutes after their shift ends
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="shiftReminder">Shift Reminder (hours before)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="shiftReminder"
              type="number"
              min="1"
              max="72"
              value={formData.shiftReminderHours}
              onChange={(e) =>
                setFormData({ ...formData, shiftReminderHours: parseInt(e.target.value) || 24 })
              }
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Send shift reminder notifications this many hours before a shift starts
          </p>
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
