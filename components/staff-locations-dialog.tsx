"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPin, Loader2 } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface StaffLocationsDialogProps {
  userId: string;
  userName: string;
  assignedLocationIds: string[];
  allLocations: Location[];
}

export function StaffLocationsDialog({
  userId,
  userName,
  assignedLocationIds,
  allLocations,
}: StaffLocationsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(assignedLocationIds);

  // Reset selected IDs when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds(assignedLocationIds);
    }
  }, [open, assignedLocationIds]);

  const handleToggle = (locationId: string) => {
    setSelectedIds((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/team/${userId}/locations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationIds: selectedIds }),
      });

      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges =
    selectedIds.length !== assignedLocationIds.length ||
    !selectedIds.every((id) => assignedLocationIds.includes(id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <MapPin className="h-3 w-3" />
          {assignedLocationIds.length === 0
            ? "Assign"
            : `${assignedLocationIds.length} location${assignedLocationIds.length !== 1 ? "s" : ""}`}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Locations</DialogTitle>
          <DialogDescription>
            Select which locations {userName} can work at and view on the schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {allLocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No locations configured</p>
              <p className="text-sm">Create locations first in the Locations page</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allLocations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleToggle(location.id)}
                >
                  <Checkbox
                    id={location.id}
                    checked={selectedIds.includes(location.id)}
                    onCheckedChange={() => handleToggle(location.id)}
                  />
                  <Label
                    htmlFor={location.id}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {location.name}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !hasChanges}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
