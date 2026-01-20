"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ClipboardCheck, GripVertical, ToggleLeft, ToggleRight } from "lucide-react";

interface CheckType {
  id: string;
  name: string;
  description: string | null;
  frequencyDays: number;
  isActive: boolean;
  sortOrder: number;
  _count: {
    logs: number;
  };
}

export function MaintenanceCheckTypesManager() {
  const router = useRouter();
  const [checkTypes, setCheckTypes] = useState<CheckType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<CheckType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    frequencyDays: 1,
    isActive: true,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchCheckTypes();
  }, []);

  const fetchCheckTypes = async () => {
    try {
      const res = await fetch("/api/maintenance/check-types");
      if (res.ok) {
        setCheckTypes(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch check types:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      frequencyDays: 1,
      isActive: true,
      sortOrder: checkTypes.length,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: CheckType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      frequencyDays: item.frequencyDays,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/maintenance/check-types/${editingItem.id}`
        : "/api/maintenance/check-types";
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          description: formData.description || null,
        }),
      });

      if (res.ok) {
        setShowDialog(false);
        resetForm();
        fetchCheckTypes();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const checkType = checkTypes.find((ct) => ct.id === id);
    if (!checkType) return;

    const hasLogs = checkType._count.logs > 0;
    const message = hasLogs
      ? `This will delete "${checkType.name}" and all ${checkType._count.logs} associated maintenance log(s). This cannot be undone.`
      : `Are you sure you want to delete "${checkType.name}"?`;

    if (!confirm(message)) {
      return;
    }

    try {
      const res = await fetch(`/api/maintenance/check-types/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchCheckTypes();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleToggleActive = async (item: CheckType) => {
    try {
      const res = await fetch(`/api/maintenance/check-types/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      if (res.ok) {
        fetchCheckTypes();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to toggle active:", error);
    }
  };

  const getFrequencyLabel = (days: number) => {
    if (days === 1) return "Daily";
    if (days === 7) return "Weekly";
    if (days === 14) return "Bi-weekly";
    if (days === 30) return "Monthly";
    return `Every ${days} days`;
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Configure the types of maintenance checks that need to be performed at each location.
          </p>
          <Button
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Check Type
          </Button>
        </div>

        {checkTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No check types configured</p>
            <p className="text-sm mt-1">Add your first check type to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {checkTypes.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-4 border rounded-lg",
                  !item.isActive && "opacity-60 bg-muted/50"
                )}
              >
                <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-move" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {getFrequencyLabel(item.frequencyDays)}
                    </Badge>
                    {!item.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {item._count.logs} log{item._count.logs !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleActive(item)}
                    title={item.isActive ? "Deactivate" : "Activate"}
                  >
                    {item.isActive ? (
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Check Type" : "Add Check Type"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the check type details"
                : "Create a new maintenance check type"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Matting, Drills, Ladders"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What should be checked"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Check Frequency</Label>
              <div className="flex gap-2">
                <Input
                  id="frequency"
                  type="number"
                  min="1"
                  value={formData.frequencyDays}
                  onChange={(e) =>
                    setFormData({ ...formData, frequencyDays: parseInt(e.target.value) || 1 })
                  }
                  className="w-24"
                />
                <span className="flex items-center text-sm text-muted-foreground">
                  day{formData.frequencyDays !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  { label: "Daily", days: 1 },
                  { label: "Weekly", days: 7 },
                  { label: "Bi-weekly", days: 14 },
                  { label: "Monthly", days: 30 },
                ].map((preset) => (
                  <Button
                    key={preset.days}
                    type="button"
                    variant={formData.frequencyDays === preset.days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, frequencyDays: preset.days })}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked === true })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving ? "Saving..." : editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
