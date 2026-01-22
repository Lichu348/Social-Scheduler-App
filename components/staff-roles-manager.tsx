"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Plus, Trash2, Users } from "lucide-react";

interface StaffRole {
  id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  isActive: boolean;
}

// Default roles that can be created if none exist
const DEFAULT_ROLES = [
  { name: "Front Desk", code: "DESK", color: "#3b82f6" },
  { name: "Coach", code: "COACH", color: "#10b981" },
  { name: "Route Setter", code: "SETTER", color: "#f59e0b" },
  { name: "Instructor", code: "INSTRUCTOR", color: "#8b5cf6" },
];

export function StaffRolesManager() {
  const router = useRouter();
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    color: "#6b7280",
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/staff-roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (error) {
      console.error("Failed to fetch staff roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/staff-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setFormData({ name: "", code: "", description: "", color: "#6b7280" });
        setShowForm(false);
        fetchRoles();
        router.refresh();
      } else {
        setError(data.error || "Failed to create staff role");
      }
    } catch (error) {
      console.error("Failed to create staff role:", error);
      setError("Failed to create staff role");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      const res = await fetch(`/api/staff-roles/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        fetchRoles();
        router.refresh();
      } else {
        alert(data.error || "Failed to delete role");
      }
    } catch (error) {
      console.error("Failed to delete staff role:", error);
    }
  };

  const handleCreateDefaults = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const role of DEFAULT_ROLES) {
        await fetch("/api/staff-roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(role),
        });
      }
      fetchRoles();
      router.refresh();
    } catch (error) {
      console.error("Failed to create default roles:", error);
      setError("Failed to create default roles");
    } finally {
      setSaving(false);
    }
  };

  // Auto-generate code from name
  const handleNameChange = (name: string) => {
    const code = name
      .toUpperCase()
      .replace(/[^A-Z\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 20);
    setFormData({ ...formData, name, code });
  };

  if (loading) {
    return <div className="text-center py-4">Loading staff roles...</div>;
  }

  return (
    <div className="space-y-4">
      {roles.length === 0 && !showForm ? (
        <div className="text-center py-6 space-y-4">
          <p className="text-muted-foreground text-sm">No staff roles configured yet.</p>
          <Button variant="outline" onClick={handleCreateDefaults} disabled={saving}>
            {saving ? "Creating..." : "Create Default Roles"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Creates: Front Desk, Coach, Route Setter, Instructor
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{role.name}</span>
                    <span className="text-xs text-muted-foreground">({role.code})</span>
                    {!role.isActive && (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Inactive</span>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-sm text-muted-foreground ml-6">{role.description}</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                placeholder="Front Desk"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleCode">Code</Label>
              <Input
                id="roleCode"
                placeholder="FRONT_DESK"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
              <p className="text-xs text-muted-foreground">Uppercase letters and underscores only</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleDesc">Description (optional)</Label>
            <Input
              id="roleDesc"
              placeholder="Handles customer check-ins and inquiries"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleColor">Color</Label>
            <div className="flex gap-2">
              <Input
                id="roleColor"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-16 h-10 p-1"
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Role"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : roles.length > 0 && (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      )}
    </div>
  );
}
