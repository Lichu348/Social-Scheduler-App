"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Location {
  id: string;
  name: string;
}

interface SpendFiltersProps {
  locations: Location[];
  currentMonth?: string;
  currentStatus?: string;
  currentLocationId?: string;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

function getMonthOptions() {
  const options = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    options.push({ value, label });
  }

  return options;
}

export function SpendFilters({
  locations,
  currentMonth,
  currentStatus,
  currentLocationId,
}: SpendFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const monthOptions = getMonthOptions();

  const locationOptions = [
    { value: "", label: "All Locations" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== "ALL" && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/dashboard/spend?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <div className="space-y-2">
        <Label htmlFor="month-filter">Month</Label>
        <Select
          id="month-filter"
          options={monthOptions}
          value={currentMonth || monthOptions[0]?.value || ""}
          onChange={(e) => updateFilter("month", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status-filter">Status</Label>
        <Select
          id="status-filter"
          options={STATUS_OPTIONS}
          value={currentStatus || "ALL"}
          onChange={(e) => updateFilter("status", e.target.value)}
        />
      </div>

      {locations.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="location-filter">Location</Label>
          <Select
            id="location-filter"
            options={locationOptions}
            value={currentLocationId || ""}
            onChange={(e) => updateFilter("locationId", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
