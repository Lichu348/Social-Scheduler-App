"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Plus, Trash2, Loader2, Clock, Edit2 } from "lucide-react";

interface BreakRule {
  minHours: number;
  breakMinutes: number;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  clockInRadiusMetres: number;
  breakRules: string | null;
  isActive: boolean;
  _count: {
    staff: number;
    shifts: number;
  };
}

export function LocationsManager() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    clockInRadiusMetres: 100,
  });
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [breakRulesData, setBreakRulesData] = useState<BreakRule[]>([
    { minHours: 4, breakMinutes: 15 },
    { minHours: 6, breakMinutes: 30 },
    { minHours: 8, breakMinutes: 60 },
  ]);
  const [savingBreakRules, setSavingBreakRules] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        });
        setGettingLocation(false);
      },
      () => setGettingLocation(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          clockInRadiusMetres: formData.clockInRadiusMetres,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFormData({ name: "", address: "", latitude: "", longitude: "", clockInRadiusMetres: 100 });
        setShowForm(false);
        fetchLocations();
        router.refresh();
      } else {
        setError(data.error || "Failed to create location");
      }
    } catch (error) {
      console.error("Failed to create location:", error);
      setError("Failed to create location");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;
    try {
      const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchLocations();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete location:", error);
    }
  };

  const handleEditBreakRules = (location: Location) => {
    if (editingLocationId === location.id) {
      setEditingLocationId(null);
      return;
    }
    setEditingLocationId(location.id);
    if (location.breakRules) {
      try {
        setBreakRulesData(JSON.parse(location.breakRules));
      } catch {
        setBreakRulesData([]);
      }
    } else {
      setBreakRulesData([]);
    }
  };

  const handleSaveBreakRules = async (locationId: string) => {
    setSavingBreakRules(true);
    try {
      const breakRulesJson = breakRulesData.length > 0 ? JSON.stringify(breakRulesData) : null;
      const res = await fetch(`/api/locations/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakRules: breakRulesJson }),
      });
      if (res.ok) {
        fetchLocations();
        setEditingLocationId(null);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to save break rules:", error);
    } finally {
      setSavingBreakRules(false);
    }
  };

  const addBreakRule = () => {
    setBreakRulesData([...breakRulesData, { minHours: 0, breakMinutes: 0 }]);
  };

  const removeBreakRule = (index: number) => {
    setBreakRulesData(breakRulesData.filter((_, i) => i !== index));
  };

  const updateBreakRule = (index: number, field: "minHours" | "breakMinutes", value: number) => {
    const newRules = [...breakRulesData];
    newRules[index][field] = value;
    setBreakRulesData(newRules);
  };

  if (loading) {
    return <div className="text-center py-4">Loading locations...</div>;
  }

  return (
    <div className="space-y-4">
      {locations.length === 0 && !showForm ? (
        <p className="text-muted-foreground text-sm">No locations configured yet.</p>
      ) : (
        <div className="space-y-3">
          {locations.map((location) => {
            const hasBreakRules = location.breakRules && JSON.parse(location.breakRules).length > 0;
            return (
              <div key={location.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{location.name}</span>
                      {!location.isActive && (
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Inactive</span>
                      )}
                      {hasBreakRules && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Custom Breaks</span>
                      )}
                    </div>
                    {location.address && (
                      <p className="text-sm text-muted-foreground ml-6">{location.address}</p>
                    )}
                    <p className="text-xs text-muted-foreground ml-6">
                      {location._count.staff} staff • {location._count.shifts} shifts • {location.clockInRadiusMetres}m radius
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditBreakRules(location)}>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(location.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Break Rules Editor */}
                {editingLocationId === location.id && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium text-sm">Break Rules</span>
                      <span className="text-xs text-muted-foreground">(Leave empty to use organization defaults)</span>
                    </div>

                    {breakRulesData.length === 0 ? (
                      <p className="text-sm text-muted-foreground mb-3">No custom break rules - using organization defaults</p>
                    ) : (
                      <div className="space-y-2 mb-3">
                        {breakRulesData.map((rule, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-sm">If shift</span>
                            <Input
                              type="number"
                              min="0"
                              value={rule.minHours}
                              onChange={(e) => updateBreakRule(index, "minHours", parseInt(e.target.value) || 0)}
                              className="w-16 h-8"
                            />
                            <span className="text-sm">+ hours, give</span>
                            <Input
                              type="number"
                              min="0"
                              value={rule.breakMinutes}
                              onChange={(e) => updateBreakRule(index, "breakMinutes", parseInt(e.target.value) || 0)}
                              className="w-16 h-8"
                            />
                            <span className="text-sm">min break</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeBreakRule(index)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={addBreakRule}>
                        <Plus className="h-3 w-3 mr-1" /> Add Rule
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveBreakRules(location.id)}
                        disabled={savingBreakRules}
                      >
                        {savingBreakRules ? "Saving..." : "Save Break Rules"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingLocationId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Location Name</Label>
            <Input
              id="name"
              placeholder="Sydney CBD"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address (optional)</Label>
            <Input
              id="address"
              placeholder="123 Climb St, Sydney"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>GPS Coordinates</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleGetCurrentLocation} disabled={gettingLocation}>
              {gettingLocation ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
              Use Current Location
            </Button>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input
                placeholder="Latitude"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              />
              <Input
                placeholder="Longitude"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="radius">Clock-in Radius (metres)</Label>
            <Input
              id="radius"
              type="number"
              min="10"
              max="1000"
              value={formData.clockInRadiusMetres}
              onChange={(e) => setFormData({ ...formData, clockInRadiusMetres: parseInt(e.target.value) || 100 })}
              className="w-24"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Location"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      )}
    </div>
  );
}
