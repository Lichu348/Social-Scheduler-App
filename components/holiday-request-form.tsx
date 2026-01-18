"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface HolidayRequestFormProps {
  maxDays: number;
}

export function HolidayRequestForm({ maxDays }: HolidayRequestFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit request");
        return;
      }

      setFormData({ startDate: "", endDate: "", reason: "" });
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) =>
              setFormData({ ...formData, startDate: e.target.value })
            }
            min={new Date().toISOString().split("T")[0]}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) =>
              setFormData({ ...formData, endDate: e.target.value })
            }
            min={formData.startDate || new Date().toISOString().split("T")[0]}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Textarea
          id="reason"
          placeholder="e.g., Family vacation, Personal day..."
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        You have <span className="font-medium">{maxDays}</span> days available
      </p>
      <Button type="submit" disabled={loading || maxDays === 0}>
        {loading ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
}
