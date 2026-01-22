"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, MapPin, Building2, Check } from "lucide-react";

interface BreakRule {
  minHours: number;
  breakMinutes: number;
}

interface Location {
  id: string;
  name: string;
  breakRules: string | null;
}

interface BreakRulesWithLocationsProps {
  organizationBreakRules: string;
  organizationBreakCalculationMode?: string;
  locations: Location[];
}

export function BreakRulesWithLocations({
  organizationBreakRules,
  organizationBreakCalculationMode = "PER_SHIFT",
  locations,
}: BreakRulesWithLocationsProps) {
  const router = useRouter();
  const [selectedSite, setSelectedSite] = useState<string>("organization");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [calculationMode, setCalculationMode] = useState(organizationBreakCalculationMode);

  // Parse break rules for current selection
  const getCurrentBreakRules = (): BreakRule[] => {
    try {
      if (selectedSite === "organization") {
        return JSON.parse(organizationBreakRules);
      }
      const location = locations.find((l) => l.id === selectedSite);
      if (location?.breakRules) {
        return JSON.parse(location.breakRules);
      }
      return []; // Location uses org defaults
    } catch {
      return [];
    }
  };

  const [rules, setRules] = useState<BreakRule[]>(getCurrentBreakRules());

  // Update rules when site selection changes
  const handleSiteChange = (siteId: string) => {
    setSelectedSite(siteId);
    setSuccess(false);
    try {
      if (siteId === "organization") {
        setRules(JSON.parse(organizationBreakRules));
      } else {
        const location = locations.find((l) => l.id === siteId);
        if (location?.breakRules) {
          setRules(JSON.parse(location.breakRules));
        } else {
          setRules([]); // Empty = use org defaults
        }
      }
    } catch {
      setRules([]);
    }
  };

  const addRule = () => {
    setRules([...rules, { minHours: 0, breakMinutes: 0 }]);
    setSuccess(false);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
    setSuccess(false);
  };

  const updateRule = (index: number, field: "minHours" | "breakMinutes", value: number) => {
    const newRules = [...rules];
    newRules[index][field] = value;
    setRules(newRules);
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const breakRulesJson = rules.length > 0 ? JSON.stringify(rules) : null;

      if (selectedSite === "organization") {
        // Save to organization
        await fetch("/api/settings/organization", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            breakRules: breakRulesJson || "[]",
            breakCalculationMode: calculationMode,
          }),
        });
      } else {
        // Save to location
        await fetch(`/api/locations/${selectedSite}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ breakRules: breakRulesJson }),
        });
      }
      setSuccess(true);
      router.refresh();
    } catch (error) {
      console.error("Failed to save break rules:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUseOrgDefaults = async () => {
    if (selectedSite === "organization") return;
    setSaving(true);
    try {
      await fetch(`/api/locations/${selectedSite}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakRules: null }),
      });
      setRules([]);
      setSuccess(true);
      router.refresh();
    } catch (error) {
      console.error("Failed to reset break rules:", error);
    } finally {
      setSaving(false);
    }
  };

  const siteOptions = [
    { value: "organization", label: "Organization Default" },
    ...locations.map((loc) => ({
      value: loc.id,
      label: loc.name,
    })),
  ];

  const currentLocation = locations.find((l) => l.id === selectedSite);
  const isUsingOrgDefaults = selectedSite !== "organization" && rules.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Break Rules Configuration</CardTitle>
            <CardDescription>
              Set automatic break times for shifts. Location-specific rules override organization defaults.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Site Selector */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {selectedSite === "organization" ? (
              <Building2 className="h-5 w-5 text-muted-foreground" />
            ) : (
              <MapPin className="h-5 w-5 text-muted-foreground" />
            )}
            <Label className="font-medium">Configure rules for:</Label>
          </div>
          <Select
            options={siteOptions}
            value={selectedSite}
            onChange={(e) => handleSiteChange(e.target.value)}
            className="w-64"
          />
        </div>

        {/* Calculation Mode - Only show for organization */}
        {selectedSite === "organization" && (
          <div className="space-y-3">
            <Label className="font-medium">Calculation Mode</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCalculationMode("PER_SHIFT")}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  calculationMode === "PER_SHIFT"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/50"
                }`}
              >
                <p className="font-medium">Per Shift</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Breaks calculated for each individual shift based on its duration
                </p>
              </button>
              <button
                type="button"
                onClick={() => setCalculationMode("PER_DAY")}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  calculationMode === "PER_DAY"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/50"
                }`}
              >
                <p className="font-medium">Per Day</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Breaks calculated based on total daily hours (e.g., 2h + 3h = 5h total)
                </p>
              </button>
            </div>
            {calculationMode === "PER_DAY" && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                Per-day mode sums all shifts for each staff member on the same day and applies break rules to the total.
              </p>
            )}
          </div>
        )}

        {/* Location-specific info */}
        {selectedSite !== "organization" && (
          <div className={`p-3 rounded-lg border ${isUsingOrgDefaults ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
            {isUsingOrgDefaults ? (
              <p className="text-sm text-blue-800">
                <strong>{currentLocation?.name}</strong> is using the organization's default break rules.
                Add custom rules below to override.
              </p>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-amber-800">
                  <strong>{currentLocation?.name}</strong> has custom break rules that override organization defaults.
                </p>
                <Button variant="outline" size="sm" onClick={handleUseOrgDefaults} disabled={saving}>
                  Use Org Defaults
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Rules Editor */}
        <div className="space-y-3">
          <Label className="font-medium">Break Rules</Label>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
              {selectedSite === "organization"
                ? "No break rules configured. Add rules below."
                : "Using organization defaults. Add rules to customize for this location."}
            </p>
          ) : (
            <div className="space-y-2">
              {rules
                .sort((a, b) => a.minHours - b.minHours)
                .map((rule, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">If shift is</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={rule.minHours}
                      onChange={(e) => updateRule(index, "minHours", parseFloat(e.target.value) || 0)}
                      className="w-20"
                    />
                    <span className="text-sm">+ hours, give</span>
                    <Input
                      type="number"
                      min="0"
                      value={rule.breakMinutes}
                      onChange={(e) => updateRule(index, "breakMinutes", parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <span className="text-sm">min unpaid break</span>
                    <Button variant="ghost" size="icon" onClick={() => removeRule(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button variant="outline" onClick={addRule}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {success && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Saved
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
