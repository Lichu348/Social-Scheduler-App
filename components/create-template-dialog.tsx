"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "@/components/ui/dialog";

interface Location {
  id: string;
  name: string;
}

interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  defaultTitle?: string | null;
  description?: string | null;
  categoryId?: string | null;
  category?: ShiftCategory | null;
  locationId?: string | null;
  location?: Location | null;
}

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ShiftTemplate | null;
  onSuccess?: () => void;
  locations?: Location[];
  defaultLocationId?: string;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
  locations = [],
  defaultLocationId = "",
}: CreateTemplateDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ShiftCategory[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    startTime: "",
    endTime: "",
    defaultTitle: "",
    categoryId: "",
    locationId: "",
  });

  const isEditing = !!template;

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

  // Reset form when dialog opens/closes or template changes
  useEffect(() => {
    if (open) {
      if (template) {
        setFormData({
          name: template.name,
          startTime: template.startTime,
          endTime: template.endTime,
          defaultTitle: template.defaultTitle || "",
          categoryId: template.categoryId || "",
          locationId: template.locationId || "",
        });
      } else {
        setFormData({
          name: "",
          startTime: "09:00",
          endTime: "17:00",
          defaultTitle: "",
          categoryId: "",
          locationId: defaultLocationId,
        });
      }
      setError(null);
    }
  }, [open, template, defaultLocationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Require location selection
    if (!formData.locationId && locations.length > 0) {
      setError("Please select a location for this template");
      setLoading(false);
      return;
    }

    try {
      const url = isEditing
        ? `/api/shift-templates/${template.id}`
        : "/api/shift-templates";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          startTime: formData.startTime,
          endTime: formData.endTime,
          defaultTitle: formData.defaultTitle || null,
          categoryId: formData.categoryId || null,
          locationId: formData.locationId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save template");
        return;
      }

      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError("Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!template || !confirm("Are you sure you want to delete this template?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/shift-templates/${template.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete template");
        return;
      }

      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError("Failed to delete template");
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [
    { value: "", label: "No Category" },
    ...categories.map((cat) => ({
      value: cat.id,
      label: `${cat.name} ($${cat.hourlyRate.toFixed(2)}/hr)`,
    })),
  ];

  const locationOptions = [
    { value: "", label: "Select location..." },
    ...locations.map((loc) => ({
      value: loc.id,
      label: loc.name,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Template" : "Create Shift Template"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this shift template"
              : "Create a reusable shift template that you can drag onto the calendar"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                placeholder="e.g., Morning Desk, Evening Coach"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Select
                  id="location"
                  options={locationOptions}
                  value={formData.locationId}
                  onChange={(e) =>
                    setFormData({ ...formData, locationId: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Each template is specific to one location
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="defaultTitle">Default Shift Title (optional)</Label>
              <Input
                id="defaultTitle"
                placeholder="Leave blank to use template name"
                value={formData.defaultTitle}
                onChange={(e) =>
                  setFormData({ ...formData, defaultTitle: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                This will be the default title for shifts created from this template
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-between flex-shrink-0 pt-4 border-t mt-4">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Create Template"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
