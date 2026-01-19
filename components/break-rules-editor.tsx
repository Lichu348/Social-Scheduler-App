"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coffee, Plus, Trash2, Clock, Check } from "lucide-react";

interface BreakRule {
  minHours: number;
  breakMinutes: number;
}

interface BreakRulesEditorProps {
  breakRules: string;
}

// Preset shift hour thresholds
const HOUR_THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function BreakRulesEditor({ breakRules }: BreakRulesEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rules, setRules] = useState<BreakRule[]>(() => {
    try {
      const parsed = JSON.parse(breakRules);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Create a map of hours to break minutes for quick lookup
  const rulesMap = useMemo(() => {
    const map: Record<number, number> = {};
    rules.forEach((rule) => {
      map[rule.minHours] = rule.breakMinutes;
    });
    return map;
  }, [rules]);

  // Calculate what break would apply for a given shift length
  const getApplicableBreak = (shiftHours: number): number => {
    const applicableRule = rules
      .filter((r) => shiftHours >= r.minHours)
      .sort((a, b) => b.minHours - a.minHours)[0];
    return applicableRule?.breakMinutes || 0;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakRules: JSON.stringify(rules) }),
      });

      if (res.ok) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to update break rules:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateRule = (hours: number, minutes: number) => {
    if (minutes === 0) {
      // Remove the rule
      setRules(rules.filter((r) => r.minHours !== hours));
    } else {
      // Add or update rule
      const existing = rules.find((r) => r.minHours === hours);
      if (existing) {
        setRules(rules.map((r) => (r.minHours === hours ? { ...r, breakMinutes: minutes } : r)));
      } else {
        setRules([...rules, { minHours: hours, breakMinutes: minutes }]);
      }
    }
  };

  const addCustomRule = () => {
    // Find the next available hour threshold not already used
    const usedHours = new Set(rules.map((r) => r.minHours));
    const nextHour = HOUR_THRESHOLDS.find((h) => !usedHours.has(h)) || Math.max(...rules.map((r) => r.minHours), 0) + 1;
    setRules([...rules, { minHours: nextHour, breakMinutes: 15 }]);
  };

  const removeRule = (hours: number) => {
    setRules(rules.filter((r) => r.minHours !== hours));
  };

  const sortedRules = [...rules].sort((a, b) => a.minHours - b.minHours);

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md flex items-center gap-2">
          <Check className="h-4 w-4" />
          Break rules saved successfully
        </div>
      )}

      {/* Rules Editor */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Coffee className="h-4 w-4" />
          <span>Configure break time for each shift duration threshold</span>
        </div>

        {sortedRules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <Coffee className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No break rules configured</p>
            <p className="text-sm">Add rules to automatically assign breaks to shifts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRules.map((rule) => (
              <div
                key={rule.minHours}
                className="flex items-center gap-4 p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Shifts</span>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={rule.minHours}
                    onChange={(e) => {
                      const newHours = parseInt(e.target.value) || 1;
                      const newRules = rules.filter((r) => r.minHours !== rule.minHours);
                      newRules.push({ minHours: newHours, breakMinutes: rule.breakMinutes });
                      setRules(newRules);
                    }}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">or more hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">=</span>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    step="5"
                    value={rule.breakMinutes}
                    onChange={(e) => updateRule(rule.minHours, parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">min break</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRule(rule.minHours)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button type="button" variant="outline" onClick={addCustomRule}>
          <Plus className="h-4 w-4 mr-2" />
          Add Break Rule
        </Button>
      </div>

      {/* Preview Section */}
      {rules.length > 0 && (
        <div className="border-t pt-6">
          <Label className="text-sm font-medium mb-3 block">Preview: Break times by shift length</Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
            {HOUR_THRESHOLDS.map((hours) => {
              const breakMins = getApplicableBreak(hours);
              return (
                <div
                  key={hours}
                  className={`text-center p-2 rounded border ${
                    breakMins > 0 ? "bg-primary/5 border-primary/20" : "bg-muted"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">{hours}h shift</p>
                  <p className={`font-medium ${breakMins > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {breakMins}m
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Templates */}
      <div className="border-t pt-6">
        <Label className="text-sm font-medium mb-3 block">Quick Templates</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRules([
              { minHours: 4, breakMinutes: 15 },
              { minHours: 6, breakMinutes: 30 },
              { minHours: 8, breakMinutes: 45 },
              { minHours: 10, breakMinutes: 60 },
            ])}
          >
            Standard (15/30/45/60)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRules([
              { minHours: 5, breakMinutes: 30 },
              { minHours: 8, breakMinutes: 60 },
            ])}
          >
            Simple (30/60)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRules([
              { minHours: 6, breakMinutes: 30 },
            ])}
          >
            Minimum (6h = 30m)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRules([])}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Save Button */}
      <div className="border-t pt-6 flex justify-end">
        <Button onClick={handleSubmit} disabled={loading} size="lg">
          {loading ? "Saving..." : "Save Break Rules"}
        </Button>
      </div>
    </div>
  );
}
