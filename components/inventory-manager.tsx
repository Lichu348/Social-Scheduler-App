"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Package,
  AlertTriangle,
  Minus,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  reorderAmount: number;
  notes: string | null;
  location: Location | null;
}

interface InventoryManagerProps {
  locations: Location[];
  isAdmin: boolean;
}

const CATEGORIES = [
  { value: "CLEANING", label: "Cleaning Supplies" },
  { value: "SAFETY", label: "Safety Equipment" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "OTHER", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  CLEANING: "bg-blue-100 text-blue-800",
  SAFETY: "bg-green-100 text-green-800",
  EQUIPMENT: "bg-purple-100 text-purple-800",
  OTHER: "bg-gray-100 text-gray-800",
};

export function InventoryManager({ locations, isAdmin }: InventoryManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    category: "CLEANING",
    unit: "units",
    currentStock: 0,
    minimumStock: 5,
    reorderAmount: 10,
    notes: "",
    locationId: "",
  });

  const [adjustData, setAdjustData] = useState({
    type: "ADD" as "ADD" | "REMOVE",
    quantity: 1,
    notes: "",
  });

  useEffect(() => {
    fetchItems();
  }, [filterLowStock, filterCategory]);

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (filterLowStock) params.set("lowStock", "true");
      if (filterCategory) params.set("category", filterCategory);

      const res = await fetch(`/api/inventory?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "CLEANING",
      unit: "units",
      currentStock: 0,
      minimumStock: 5,
      reorderAmount: 10,
      notes: "",
      locationId: "",
    });
    setEditingItem(null);
    setError(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      reorderAmount: item.reorderAmount,
      notes: item.notes || "",
      locationId: item.location?.id || "",
    });
    setError(null);
    setShowAddDialog(true);
  };

  const openAdjustDialog = (item: InventoryItem) => {
    setAdjustingItem(item);
    setAdjustData({ type: "ADD", quantity: 1, notes: "" });
    setShowAdjustDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingItem
        ? `/api/inventory/${editingItem.id}`
        : "/api/inventory";
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowAddDialog(false);
        resetForm();
        fetchItems();
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      setError("Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustingItem) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/${adjustingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustStock: true,
          adjustType: adjustData.type,
          adjustQuantity: adjustData.quantity,
          adjustNotes: adjustData.notes || null,
        }),
      });

      if (res.ok) {
        setShowAdjustDialog(false);
        setAdjustingItem(null);
        fetchItems();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to adjust stock:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      const res = await fetch(`/api/inventory/${id}`, {
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

  const lowStockItems = items.filter((item) => item.currentStock <= item.minimumStock);

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <>
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-800">Low Stock Alert</CardTitle>
            </div>
            <CardDescription className="text-amber-700">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} need reordering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item) => (
                <Badge
                  key={item.id}
                  variant="outline"
                  className="border-amber-300 text-amber-800 cursor-pointer hover:bg-amber-100"
                  onClick={() => openAdjustDialog(item)}
                >
                  {item.name}: {item.currentStock}/{item.minimumStock} {item.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4">
          <Select
            options={[
              { value: "", label: "All Categories" },
              ...CATEGORIES,
            ]}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-[180px]"
          />
          <Button
            variant={filterLowStock ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterLowStock(!filterLowStock)}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Low Stock Only
          </Button>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Inventory List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.length > 0 ? (
          items.map((item) => {
            const isLowStock = item.currentStock <= item.minimumStock;
            return (
              <Card
                key={item.id}
                className={isLowStock ? "border-amber-300" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {item.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={CATEGORY_COLORS[item.category]}>
                          {CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
                        </Badge>
                        {item.location && (
                          <Badge variant="outline">{item.location.name}</Badge>
                        )}
                      </div>
                    </div>
                    {isLowStock && (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current Stock</span>
                      <span className={`text-2xl font-bold ${isLowStock ? "text-amber-600" : ""}`}>
                        {item.currentStock} <span className="text-sm font-normal">{item.unit}</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${isLowStock ? "bg-amber-500" : "bg-green-500"}`}
                        style={{
                          width: `${Math.min(100, (item.currentStock / (item.minimumStock * 2)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Min: {item.minimumStock}</span>
                      <span>Reorder: {item.reorderAmount}</span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground italic">{item.notes}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => openAdjustDialog(item)}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Adjust
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No inventory items found. Add your first item to get started.
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Item" : "Add Inventory Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Update item details" : "Add a new item to track"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Hand Sanitizer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  options={CATEGORIES}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="bottles, packs, etc."
                />
              </div>
            </div>

            {!editingItem && (
              <div className="space-y-2">
                <Label htmlFor="currentStock">Initial Stock</Label>
                <Input
                  id="currentStock"
                  type="number"
                  min="0"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimumStock">Minimum Stock</Label>
                <Input
                  id="minimumStock"
                  type="number"
                  min="0"
                  value={formData.minimumStock}
                  onChange={(e) => setFormData({ ...formData, minimumStock: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Alert when below this</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderAmount">Reorder Amount</Label>
                <Input
                  id="reorderAmount"
                  type="number"
                  min="0"
                  value={formData.reorderAmount}
                  onChange={(e) => setFormData({ ...formData, reorderAmount: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Suggested quantity</p>
              </div>
            </div>

            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Select
                  id="location"
                  options={[
                    { value: "", label: "All Locations" },
                    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
                  ]}
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {adjustingItem?.name} - Current: {adjustingItem?.currentStock} {adjustingItem?.unit}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={adjustData.type === "ADD" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setAdjustData({ ...adjustData, type: "ADD" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Stock
              </Button>
              <Button
                variant={adjustData.type === "REMOVE" ? "destructive" : "outline"}
                className="flex-1"
                onClick={() => setAdjustData({ ...adjustData, type: "REMOVE" })}
              >
                <Minus className="mr-2 h-4 w-4" />
                Remove Stock
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={adjustData.quantity}
                onChange={(e) => setAdjustData({ ...adjustData, quantity: parseInt(e.target.value) || 1 })}
              />
              <p className="text-sm text-muted-foreground">
                New stock will be:{" "}
                <span className="font-medium">
                  {adjustingItem
                    ? Math.max(
                        0,
                        adjustingItem.currentStock +
                          (adjustData.type === "ADD" ? adjustData.quantity : -adjustData.quantity)
                      )
                    : 0}{" "}
                  {adjustingItem?.unit}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustNotes">Reason (optional)</Label>
              <Textarea
                id="adjustNotes"
                value={adjustData.notes}
                onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                placeholder="e.g., Received delivery, Used for cleaning, etc."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustStock} disabled={saving}>
              {saving ? "Saving..." : "Update Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
