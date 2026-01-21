"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Wrench, X, Upload, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
}

interface WorkLog {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  completedBy: string;
  completedAt: string;
  photoUrls: string;
  partsUsed: string | null;
  estimatedCost: number | null;
  location: Location;
  loggedBy: { id: string; name: string };
}

interface MaintenanceWorkLogProps {
  selectedLocationId?: string;
}

const CATEGORIES = [
  { value: "REPAIR", label: "Repair" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "REPLACEMENT", label: "Replacement" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "OTHER", label: "Other" },
];

const STATUSES = [
  { value: "COMPLETED", label: "Completed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DEFERRED", label: "Deferred" },
];

export function MaintenanceWorkLog({ selectedLocationId }: MaintenanceWorkLogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "REPAIR",
    status: "COMPLETED",
    completedBy: "",
    completedAt: new Date().toISOString().split("T")[0],
    locationId: "",
    photoUrls: [] as string[],
    partsUsed: "",
    estimatedCost: "",
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchWorkLogs();
  }, [selectedLocationId]);

  useEffect(() => {
    if (selectedLocationId) {
      setFormData((prev) => ({ ...prev, locationId: selectedLocationId }));
    }
  }, [selectedLocationId]);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations?activeOnly=true");
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  };

  const fetchWorkLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedLocationId) {
        params.append("locationId", selectedLocationId);
      }
      const res = await fetch(`/api/maintenance/work-log?${params}`);
      if (res.ok) {
        const data = await res.json();
        setWorkLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch work logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - formData.photoUrls.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    setUploading(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        const uploadData = new FormData();
        uploadData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        const { url } = await res.json();
        uploadedUrls.push(url);
      }

      setFormData({
        ...formData,
        photoUrls: [...formData.photoUrls, ...uploadedUrls],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photos");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormData({
      ...formData,
      photoUrls: formData.photoUrls.filter((_, i) => i !== index),
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "REPAIR",
      status: "COMPLETED",
      completedBy: "",
      completedAt: new Date().toISOString().split("T")[0],
      locationId: selectedLocationId || "",
      photoUrls: [],
      partsUsed: "",
      estimatedCost: "",
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.locationId || !formData.completedBy) {
      setError("Title, location, and completed by are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/maintenance/work-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          estimatedCost: formData.estimatedCost
            ? parseFloat(formData.estimatedCost)
            : null,
        }),
      });

      if (res.ok) {
        setShowDialog(false);
        resetForm();
        fetchWorkLogs();
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      setError("Failed to save work log");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      REPAIR: "bg-orange-100 text-orange-800",
      CLEANING: "bg-blue-100 text-blue-800",
      REPLACEMENT: "bg-red-100 text-red-800",
      INSPECTION: "bg-purple-100 text-purple-800",
      OTHER: "bg-gray-100 text-gray-800",
    };
    const labels: Record<string, string> = {
      REPAIR: "Repair",
      CLEANING: "Cleaning",
      REPLACEMENT: "Replacement",
      INSPECTION: "Inspection",
      OTHER: "Other",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[category] || colors.OTHER}`}>
        {labels[category] || category}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="warning">In Progress</Badge>;
      case "DEFERRED":
        return <Badge variant="secondary">Deferred</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const locationOptions = [
    { value: "", label: "Select location..." },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Log actual maintenance work, repairs, and cleaning tasks as they happen.
          </p>
          <Button
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Log Work
          </Button>
        </div>

        {workLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No work logged yet</p>
            <p className="text-sm mt-1">Log maintenance work as it happens</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workLogs.map((log) => {
              const photos = JSON.parse(log.photoUrls || "[]");
              return (
                <div key={log.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{log.title}</span>
                        {getCategoryBadge(log.category)}
                        {getStatusBadge(log.status)}
                      </div>
                      {log.description && (
                        <p className="text-sm text-muted-foreground">{log.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{log.location.name}</span>
                        <span>•</span>
                        <span>{formatDate(new Date(log.completedAt))}</span>
                        <span>•</span>
                        <span>By {log.completedBy}</span>
                      </div>
                      {log.partsUsed && (
                        <p className="text-sm mt-1">
                          <span className="text-muted-foreground">Parts used:</span> {log.partsUsed}
                        </p>
                      )}
                      {log.estimatedCost && (
                        <p className="text-sm mt-1">
                          <span className="text-muted-foreground">Est. cost:</span> £{log.estimatedCost.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  {photos.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {photos.map((url: string, index: number) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Photo ${index + 1}`}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Work Log Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Log Maintenance Work</DialogTitle>
            <DialogDescription>
              Record maintenance work, repairs, or cleaning tasks
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">What was done *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Fixed broken hold on wall 3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Select
                  id="location"
                  options={locationOptions}
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  options={CATEGORIES}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="completedBy">Completed By *</Label>
                <Input
                  id="completedBy"
                  value={formData.completedBy}
                  onChange={(e) => setFormData({ ...formData, completedBy: e.target.value })}
                  placeholder="Name of person"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completedAt">Date</Label>
                <Input
                  id="completedAt"
                  type="date"
                  value={formData.completedAt}
                  onChange={(e) => setFormData({ ...formData, completedAt: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                options={STATUSES}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details about the work done..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partsUsed">Parts/Materials Used</Label>
                <Input
                  id="partsUsed"
                  value={formData.partsUsed}
                  onChange={(e) => setFormData({ ...formData, partsUsed: e.target.value })}
                  placeholder="e.g., 2x bolts, silicone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedCost">Estimated Cost (£)</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimatedCost}
                  onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label>Photos (optional, up to 5)</Label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleFileUpload}
                  disabled={formData.photoUrls.length >= 5 || uploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={formData.photoUrls.length >= 5 || uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photos
                    </>
                  )}
                </Button>
              </div>
              {formData.photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.photoUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="h-16 w-16 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? "Saving..." : "Log Work"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
