"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Clock, AlertTriangle } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
}

interface BreakRule {
  minHours: number;
  breakMinutes: number;
}

interface Location {
  id: string;
  name: string;
}

interface CertificationWarning {
  isValid: boolean;
  errorMessage: string | null;
  missingCertifications: { id: string; name: string }[];
  expiredCertifications: { id: string; name: string }[];
}

interface CreateShiftDialogProps {
  users: User[];
  breakRules?: string;
  locations?: Location[];
  defaultLocationId?: string | null;
}

export function CreateShiftDialog({ users, breakRules, locations = [], defaultLocationId }: CreateShiftDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ShiftCategory[]>([]);
  const [certWarning, setCertWarning] = useState<CertificationWarning | null>(null);
  const [checkingCerts, setCheckingCerts] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    assignedToId: "",
    categoryId: "",
    locationId: defaultLocationId || "",
  });

  // Parse break rules
  const parsedBreakRules = useMemo((): BreakRule[] => {
    try {
      return breakRules ? JSON.parse(breakRules) : [];
    } catch {
      return [];
    }
  }, [breakRules]);

  // Calculate shift duration and break
  const { shiftDuration, scheduledBreak } = useMemo(() => {
    if (!formData.date || !formData.startTime || !formData.endTime) {
      return { shiftDuration: 0, scheduledBreak: 0 };
    }

    const start = new Date(`${formData.date}T${formData.startTime}`);
    const end = new Date(`${formData.date}T${formData.endTime}`);
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Find applicable break rule (use the one with highest minHours that's <= duration)
    const applicableRule = parsedBreakRules
      .filter((r) => durationHours >= r.minHours)
      .sort((a, b) => b.minHours - a.minHours)[0];

    return {
      shiftDuration: durationHours,
      scheduledBreak: applicableRule?.breakMinutes || 0,
    };
  }, [formData.date, formData.startTime, formData.endTime, parsedBreakRules]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/shift-categories?activeOnly=true");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Check certifications when user selection changes
  useEffect(() => {
    const checkCertifications = async () => {
      if (!formData.assignedToId) {
        setCertWarning(null);
        return;
      }

      setCheckingCerts(true);
      try {
        const res = await fetch(`/api/certifications/check?userId=${formData.assignedToId}`);
        if (res.ok) {
          const data = await res.json();
          setCertWarning(data);
        }
      } catch (error) {
        console.error("Failed to check certifications:", error);
      } finally {
        setCheckingCerts(false);
      }
    };
    checkCertifications();
  }, [formData.assignedToId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          assignedToId: formData.assignedToId || null,
          categoryId: formData.categoryId || null,
          locationId: formData.locationId || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setOpen(false);
        setFormData({
          title: "",
          description: "",
          date: "",
          startTime: "",
          endTime: "",
          assignedToId: "",
          categoryId: "",
          locationId: defaultLocationId || "",
        });
        router.refresh();
      } else {
        setError(data.error || "Failed to create shift. Please try logging out and back in.");
      }
    } catch (error) {
      console.error("Failed to create shift:", error);
      setError("Failed to create shift. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const userOptions = [
    { value: "", label: "Unassigned (Open Shift)" },
    ...users.map((user) => ({ value: user.id, label: user.name })),
  ];

  const categoryOptions = [
    { value: "", label: "No Category" },
    ...categories.map((cat) => ({ value: cat.id, label: `${cat.name} ($${cat.hourlyRate.toFixed(2)}/hr)` })),
  ];

  const locationOptions = [
    { value: "", label: "No Location" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Shift
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
          <DialogDescription>
            Add a new shift to the schedule. Leave unassigned to create an open shift.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive mb-4">
              {error}
            </div>
          )}
          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="title">Shift Title</Label>
              <Input
                id="title"
                placeholder="e.g., Morning Shift, Evening Shift"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Any additional notes..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  id="location"
                  options={locationOptions}
                  value={formData.locationId}
                  onChange={(e) =>
                    setFormData({ ...formData, locationId: e.target.value })
                  }
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                id="category"
                options={categoryOptions}
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assign To</Label>
              <Select
                id="assignedTo"
                options={userOptions}
                value={formData.assignedToId}
                onChange={(e) =>
                  setFormData({ ...formData, assignedToId: e.target.value })
                }
              />
            </div>
            {/* Certification warning */}
            {checkingCerts && (
              <div className="text-sm text-muted-foreground">
                Checking certifications...
              </div>
            )}
            {certWarning && !certWarning.isValid && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Certification Warning
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    {certWarning.errorMessage}
                  </p>
                  <p className="text-amber-600 dark:text-amber-400 text-xs">
                    This staff member cannot be assigned to shifts until certifications are up to date.
                  </p>
                </div>
              </div>
            )}
            {/* Show calculated break time */}
            {shiftDuration > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Shift duration: {shiftDuration.toFixed(2)} hours
                  {scheduledBreak > 0 && (
                    <span className="text-muted-foreground">
                      {" "}| Scheduled break: {scheduledBreak} min
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (certWarning !== null && !certWarning.isValid)}>
              {loading ? "Creating..." : "Create Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
