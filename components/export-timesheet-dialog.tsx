"use client";

import { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";

export function ExportTimesheetDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    format: "xlsx",
  });

  // Set default dates (current week)
  const setDefaultDates = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    setFormData({
      ...formData,
      startDate: startOfWeek.toISOString().split("T")[0],
      endDate: endOfWeek.toISOString().split("T")[0],
    });
  };

  // Set preset date ranges
  const setPresetRange = (preset: string) => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date();

    switch (preset) {
      case "thisWeek":
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        end.setDate(start.getDate() + 6);
        break;
      case "lastWeek":
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay() - 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        return;
    }

    setFormData({
      ...formData,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  };

  const handleExport = async () => {
    if (!formData.startDate || !formData.endDate) {
      setError("Please select both start and end dates");
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError("Start date must be before end date");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: formData.startDate,
        endDate: formData.endDate,
        format: formData.format,
      });

      const res = await fetch(`/api/time-entries/export?${params}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }

      // Download the file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timesheet_${formData.startDate}_to_${formData.endDate}.${formData.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const formatOptions = [
    { value: "xlsx", label: "Excel (.xlsx)" },
    { value: "csv", label: "CSV (.csv)" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen && !formData.startDate) {
          setDefaultDates();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Timesheet</DialogTitle>
          <DialogDescription>
            Select a date range to export time entries for payroll
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {/* Quick presets */}
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPresetRange("thisWeek")}
              >
                This Week
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPresetRange("lastWeek")}
              >
                Last Week
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPresetRange("thisMonth")}
              >
                This Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPresetRange("lastMonth")}
              >
                Last Month
              </Button>
            </div>
          </div>

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
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Export Format</Label>
            <Select
              id="format"
              options={formatOptions}
              value={formData.format}
              onChange={(e) =>
                setFormData({ ...formData, format: e.target.value })
              }
            />
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>The export will include:</p>
            <ul className="list-disc list-inside ml-2">
              <li>Employee name and email</li>
              <li>Clock in/out times and breaks</li>
              <li>Gross and net hours</li>
              <li>Shift category and hourly rate</li>
              <li>Calculated total pay</li>
              <li>Summary by employee</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading || !formData.startDate || !formData.endDate}
          >
            {loading ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
