"use client";

import { useRouter, usePathname } from "next/navigation";
import { Select } from "@/components/ui/select";
import { MapPin } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface LocationScheduleFilterProps {
  locations: Location[];
  currentLocationId: string;
}

export function LocationScheduleFilter({ locations, currentLocationId }: LocationScheduleFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locationId = e.target.value;
    if (locationId === "all") {
      router.push(pathname);
    } else {
      router.push(`${pathname}?location=${locationId}`);
    }
  };

  const options = [
    { value: "all", label: "All Locations" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <Select
        options={options}
        value={currentLocationId}
        onChange={handleLocationChange}
        className="w-48"
      />
    </div>
  );
}
