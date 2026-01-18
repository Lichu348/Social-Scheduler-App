"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

interface BreakRule {
  minHours: number;
  breakMinutes: number;
}

interface BreakRulesFormProps {
  breakRules: string;
}

export function BreakRulesForm({ breakRules }: BreakRulesFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rules, setRules] = useState<BreakRule[]>(() => {
    try {
      return JSON.parse(breakRules);
    } catch {
      return [
        { minHours: 4, breakMinutes: 15 },
        { minHours: 6, breakMinutes: 30 },
        { minHours: 8, breakMinutes: 60 },
      ];
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      }
    } catch (error) {
      console.error("Failed to update break rules:", error);
    } finally {
      setLoading(false);
    }
  };

  const addRule = () => {
    const maxHours = Math.max(...rules.map((r) => r.minHours), 0);
    setRules([...rules, { minHours: maxHours + 2, breakMinutes: 15 }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof BreakRule, value: number) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
          Break rules updated successfully
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Configure automatic break times based on shift duration. Breaks are automatically added when creating shifts.
      </p>

      <div className="space-y-3">
        {rules
          .sort((a, b) => a.minHours - b.minHours)
          .map((rule, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Shifts</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={rule.minHours}
                  onChange={(e) => updateRule(index, "minHours", parseInt(e.target.value) || 0)}
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">+ hours</span>
              </div>
              <span className="text-muted-foreground">=</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={rule.breakMinutes}
                  onChange={(e) => updateRule(index, "breakMinutes", parseInt(e.target.value) || 0)}
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">min break</span>
              </div>
              {rules.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRule(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRule}>
        <Plus className="h-4 w-4 mr-2" />
        Add Rule
      </Button>

      <div className="pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Break Rules"}
        </Button>
      </div>
    </form>
  );
}
