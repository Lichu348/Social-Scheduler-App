"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
  isActive: boolean;
}

const colorOptions = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#eab308", label: "Yellow" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#f97316", label: "Orange" },
  { value: "#ec4899", label: "Pink" },
  { value: "#14b8a6", label: "Teal" },
];

export function ShiftCategoriesManager() {
  const router = useRouter();
  const [categories, setCategories] = useState<ShiftCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    hourlyRate: "",
    color: "#3b82f6",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/shift-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/shift-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          hourlyRate: parseFloat(formData.hourlyRate),
          color: formData.color,
        }),
      });

      if (res.ok) {
        setFormData({ name: "", hourlyRate: "", color: "#3b82f6" });
        setShowAdd(false);
        fetchCategories();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to add category:", error);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch(`/api/shift-categories/£{id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          hourlyRate: parseFloat(formData.hourlyRate),
          color: formData.color,
        }),
      });

      if (res.ok) {
        setEditingId(null);
        setFormData({ name: "", hourlyRate: "", color: "#3b82f6" });
        fetchCategories();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update category:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`/api/shift-categories/£{id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchCategories();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const startEdit = (category: ShiftCategory) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      hourlyRate: category.hourlyRate.toString(),
      color: category.color,
    });
    setShowAdd(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", hourlyRate: "", color: "#3b82f6" });
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Category List */}
      <div className="space-y-2">
        {categories.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground">No categories yet. Add one to get started.</p>
        )}
        {categories.map((category) => (
          <div
            key={category.id}
            className={`flex items-center gap-3 p-3 border rounded-md £{
              !category.isActive ? "opacity-50" : ""
            }`}
          >
            {editingId === category.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdate(category.id);
                }}
                className="flex-1 flex items-center gap-2"
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: formData.color }}
                />
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Category name"
                  className="flex-1"
                  required
                />
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">£</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    placeholder="Rate"
                    className="w-20"
                    required
                  />
                  <span className="text-sm text-muted-foreground">/hr</span>
                </div>
                <select
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-9 px-2 border rounded-md bg-transparent text-sm"
                >
                  {colorOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="ghost">
                  <Check className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <>
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <span className="flex-1 font-medium">{category.name}</span>
                <span className="text-sm text-muted-foreground">
                  £{category.hourlyRate.toFixed(2)}/hr
                </span>
                {!category.isActive && (
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Inactive</span>
                )}
                <Button size="sm" variant="ghost" onClick={() => startEdit(category)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(category.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showAdd ? (
        <form onSubmit={handleAdd} className="space-y-3 p-3 border rounded-md bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="catName">Name</Label>
              <Input
                id="catName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Customer Service"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="catRate">Hourly Rate (£)</Label>
              <Input
                id="catRate"
                type="number"
                step="0.01"
                min="0"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                placeholder="15.00"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Color</Label>
            <div className="flex gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 £{
                    formData.color === c.value ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setFormData({ ...formData, color: c.value })}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Add Category</Button>
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      )}
    </div>
  );
}
