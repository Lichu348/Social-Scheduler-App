"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, RotateCcw } from "lucide-react";

interface CategoryRate {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  defaultRate: number;
  userRate: number | null;
  effectiveRate: number;
  hasCustomRate: boolean;
}

interface UserRatesEditorProps {
  userId: string;
  userName: string;
}

export function UserRatesEditor({ userId, userName }: UserRatesEditorProps) {
  const router = useRouter();
  const [rates, setRates] = useState<CategoryRate[]>([]);
  const [editedRates, setEditedRates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRates();
  }, [userId]);

  const fetchRates = async () => {
    try {
      const res = await fetch(`/api/team/${userId}/rates`);
      if (res.ok) {
        const data = await res.json();
        setRates(data);
        // Initialize edited rates with current values
        const initial: Record<string, string> = {};
        data.forEach((r: CategoryRate) => {
          initial[r.categoryId] = r.userRate !== null ? r.userRate.toString() : "";
        });
        setEditedRates(initial);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load rates");
      }
    } catch (err) {
      setError("Failed to load rates");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const ratesToSave = Object.entries(editedRates).map(([categoryId, value]) => ({
        categoryId,
        hourlyRate: value === "" ? null : parseFloat(value),
      }));

      const res = await fetch(`/api/team/${userId}/rates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rates: ratesToSave }),
      });

      if (res.ok) {
        fetchRates();
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save rates");
      }
    } catch (err) {
      setError("Failed to save rates");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (categoryId: string) => {
    setEditedRates((prev) => ({
      ...prev,
      [categoryId]: "",
    }));
  };

  const hasChanges = rates.some((r) => {
    const edited = editedRates[r.categoryId];
    const original = r.userRate !== null ? r.userRate.toString() : "";
    return edited !== original;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rates.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        No shift categories configured. Create categories first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
          {error}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Set custom hourly rates for {userName}. Leave blank to use the default rate.
      </p>

      <div className="space-y-3">
        {rates.map((rate) => (
          <div
            key={rate.categoryId}
            className="flex items-center gap-4 p-3 border rounded-lg"
          >
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: rate.categoryColor }}
            />
            <div className="flex-1 min-w-0">
              <Label className="font-medium">{rate.categoryName}</Label>
              <p className="text-xs text-muted-foreground">
                Default: £{rate.defaultRate.toFixed(2)}/hr
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  £
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={rate.defaultRate.toFixed(2)}
                  value={editedRates[rate.categoryId] || ""}
                  onChange={(e) =>
                    setEditedRates((prev) => ({
                      ...prev,
                      [rate.categoryId]: e.target.value,
                    }))
                  }
                  className="w-28 pl-7"
                />
              </div>
              {editedRates[rate.categoryId] !== "" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleReset(rate.categoryId)}
                  title="Reset to default"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving || !hasChanges}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Rates
          </>
        )}
      </Button>
    </div>
  );
}
