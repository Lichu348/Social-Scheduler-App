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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, FileText, Award, X, ClipboardCheck } from "lucide-react";

interface ComplianceItem {
  id: string;
  name: string;
  description: string | null;
  type: "POLICY" | "QUALIFICATION" | "REVIEW";
  validityMonths: number;
  isRequired: boolean;
  requiredForRoles: string[];
  fileUrl: string | null;
  fileName: string | null;
  requiresProof: boolean;
  isActive: boolean;
  totalRecords: number;
}

const staffRoles = [
  { value: "DESK", label: "Front Desk" },
  { value: "COACH", label: "Coach" },
  { value: "SETTER", label: "Setter" },
  { value: "INSTRUCTOR", label: "Instructor" },
];

export function ComplianceItemsManager() {
  const router = useRouter();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "POLICY" as "POLICY" | "QUALIFICATION" | "REVIEW",
    validityMonths: 12,
    isRequired: false,
    requiredForRoles: [] as string[],
    fileUrl: "",
    fileName: "",
    requiresProof: false,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/compliance");
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "POLICY",
      validityMonths: 12,
      isRequired: false,
      requiredForRoles: [],
      fileUrl: "",
      fileName: "",
      requiresProof: false,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: ComplianceItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      type: item.type,
      validityMonths: item.validityMonths,
      isRequired: item.isRequired,
      requiredForRoles: item.requiredForRoles,
      fileUrl: item.fileUrl || "",
      fileName: item.fileName || "",
      requiresProof: item.requiresProof,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/compliance/${editingItem.id}`
        : "/api/compliance";
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          description: formData.description || null,
          fileUrl: formData.fileUrl || null,
          fileName: formData.fileName || null,
        }),
      });

      if (res.ok) {
        setShowDialog(false);
        resetForm();
        fetchItems();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item? All compliance records will be lost.")) {
      return;
    }

    try {
      const res = await fetch(`/api/compliance/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchItems();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      requiredForRoles: prev.requiredForRoles.includes(role)
        ? prev.requiredForRoles.filter((r) => r !== role)
        : [...prev.requiredForRoles, role],
    }));
  };

  const policies = items.filter((i) => i.type === "POLICY");
  const qualifications = items.filter((i) => i.type === "QUALIFICATION");
  const reviews = items.filter((i) => i.type === "REVIEW");

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <>
      <Tabs defaultValue="policies">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="policies">
              <FileText className="h-4 w-4 mr-2" />
              Policies ({policies.length})
            </TabsTrigger>
            <TabsTrigger value="qualifications">
              <Award className="h-4 w-4 mr-2" />
              Qualifications ({qualifications.length})
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Reviews ({reviews.length})
            </TabsTrigger>
          </TabsList>
          <Button
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        <TabsContent value="policies" className="space-y-2">
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No policies yet. Add one to get started.
            </p>
          ) : (
            policies.map((item) => (
              <ItemRow key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
            ))
          )}
        </TabsContent>

        <TabsContent value="qualifications" className="space-y-2">
          {qualifications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No qualifications yet. Add one to get started.
            </p>
          ) : (
            qualifications.map((item) => (
              <ItemRow key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
            ))
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-2">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No performance reviews yet. Add one to get started.
            </p>
          ) : (
            reviews.map((item) => (
              <ItemRow key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Compliance Item" : "Add Compliance Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the compliance item details"
                : "Create a new policy or qualification for your team"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="relative">
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as "POLICY" | "QUALIFICATION" | "REVIEW" })
                  }
                  disabled={!!editingItem}
                  className={cn(
                    "flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <option value="POLICY">Policy (document to acknowledge)</option>
                  <option value="QUALIFICATION">Qualification (certification to track)</option>
                  <option value="REVIEW">Performance Review (manager-led review)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={
                  formData.type === "POLICY"
                    ? "e.g., Health & Safety Policy"
                    : formData.type === "QUALIFICATION"
                    ? "e.g., First Aid Certificate"
                    : "e.g., Annual Performance Review"
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what this covers"
                rows={2}
              />
            </div>

            {formData.type === "POLICY" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fileUrl">Document URL</Label>
                  <Input
                    id="fileUrl"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fileName">File Name</Label>
                  <Input
                    id="fileName"
                    value={formData.fileName}
                    onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                    placeholder="policy.pdf"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="validity">Validity Period (months)</Label>
              <Input
                id="validity"
                type="number"
                min="1"
                value={formData.validityMonths}
                onChange={(e) =>
                  setFormData({ ...formData, validityMonths: parseInt(e.target.value) || 12 })
                }
              />
              <p className="text-xs text-muted-foreground">
                How long before staff need to re-acknowledge/renew
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRequired"
                  checked={formData.isRequired}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isRequired: checked === true })
                  }
                />
                <Label htmlFor="isRequired">Required for all staff</Label>
              </div>
            </div>

            {!formData.isRequired && (
              <div className="space-y-2">
                <Label>Required for roles</Label>
                <div className="flex flex-wrap gap-2">
                  {staffRoles.map((role) => (
                    <Badge
                      key={role.value}
                      variant={
                        formData.requiredForRoles.includes(role.value)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => toggleRole(role.value)}
                    >
                      {role.label}
                      {formData.requiredForRoles.includes(role.value) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty if this is optional for all staff
                </p>
              </div>
            )}
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

function ItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: ComplianceItem;
  onEdit: (item: ComplianceItem) => void;
  onDelete: (id: string) => void;
}) {
  const getIcon = () => {
    switch (item.type) {
      case "POLICY":
        return <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />;
      case "QUALIFICATION":
        return <Award className="h-5 w-5 text-purple-600 flex-shrink-0" />;
      case "REVIEW":
        return <ClipboardCheck className="h-5 w-5 text-green-600 flex-shrink-0" />;
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 border rounded-md">
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name}</span>
          {item.isRequired && (
            <Badge variant="outline" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground truncate">{item.description}</p>
        )}
      </div>
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {item.validityMonths} months
      </div>
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {item.totalRecords} records
      </div>
      <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
