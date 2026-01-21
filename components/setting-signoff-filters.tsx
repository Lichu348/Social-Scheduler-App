"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface SettingSignoffFiltersProps {
  locations: Location[];
  currentLocationId?: string;
  currentStartDate?: string;
  currentEndDate?: string;
}

export function SettingSignoffFilters({
  locations,
  currentLocationId,
  currentStartDate,
  currentEndDate,
}: SettingSignoffFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const locationOptions = [
    { value: "", label: "All Sites" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/dashboard/setting-signoffs?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/dashboard/setting-signoffs");
  };

  const hasFilters = currentLocationId || currentStartDate || currentEndDate;

  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <div className="space-y-2">
        <Label htmlFor="location-filter">Site</Label>
        <Select
          id="location-filter"
          options={locationOptions}
          value={currentLocationId || ""}
          onChange={(e) => updateFilter("locationId", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="start-date">From</Label>
        <Input
          id="start-date"
          type="date"
          value={currentStartDate || ""}
          onChange={(e) => updateFilter("startDate", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="end-date">To</Label>
        <Input
          id="end-date"
          type="date"
          value={currentEndDate || ""}
          onChange={(e) => updateFilter("endDate", e.target.value)}
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
