"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface TimesheetExportFormProps {
  locations: Location[];
}

export function TimesheetExportForm({ locations }: TimesheetExportFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Default to current pay period (last 2 weeks)
  const today = new Date();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [formData, setFormData] = useState({
    startDate: twoWeeksAgo.toISOString().split("T")[0],
    endDate: today.toISOString().split("T")[0],
    locationId: "all",
    format: "xlsx",
  });

  const handleExport = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        startDate: formData.startDate,
        endDate: formData.endDate,
        format: formData.format,
      });

      if (formData.locationId !== "all") {
        params.append("locationId", formData.locationId);
      }

      const res = await fetch(`/api/time-entries/export?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to export timesheet");
        return;
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
    } catch (err) {
      setError("Failed to export timesheet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const locationOptions = [
    { value: "all", label: "All Locations" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  const formatOptions = [
    { value: "xlsx", label: "Excel (.xlsx)" },
    { value: "csv", label: "CSV (.csv)" },
  ];

  // Quick date range buttons
  const setDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setFormData({
      ...formData,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFormData({
      ...formData,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  };

  const setLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    setFormData({
      ...formData,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {/* Quick date selectors */}
      <div className="space-y-2">
        <Label>Quick Select</Label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setDateRange(7)}>
            Last 7 days
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setDateRange(14)}>
            Last 14 days
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setDateRange(30)}>
            Last 30 days
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={setCurrentMonth}>
            This Month
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={setLastMonth}>
            Last Month
          </Button>
        </div>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Location filter */}
      {locations.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Select
            id="location"
            options={locationOptions}
            value={formData.locationId}
            onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Filter by staff's primary location
          </p>
        </div>
      )}

      {/* Format */}
      <div className="space-y-2">
        <Label htmlFor="format">Export Format</Label>
        <Select
          id="format"
          options={formatOptions}
          value={formData.format}
          onChange={(e) => setFormData({ ...formData, format: e.target.value })}
        />
      </div>

      {/* Export button */}
      <Button onClick={handleExport} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Export Timesheet
          </>
        )}
      </Button>

      {/* Info */}
      <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Export includes:</span>
        </div>
        <ul className="list-disc list-inside text-muted-foreground ml-6 space-y-1">
          <li>Detailed timesheet with clock in/out times</li>
          <li>Break durations and net hours</li>
          <li>Shift categories and hourly rates</li>
          <li>Calculated pay per entry</li>
          <li>Summary sheet with totals per employee</li>
        </ul>
      </div>
    </div>
  );
}
