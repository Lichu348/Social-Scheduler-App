"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Calendar, Pencil, Trash2, Banknote } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PayPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  payDate: string | null;
  notes: string | null;
  isActive: boolean;
}

export function PayPeriodsManager() {
  const router = useRouter();
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PayPeriod | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    payDate: "",
    notes: "",
  });

  useEffect(() => {
    fetchPayPeriods();
  }, []);

  const fetchPayPeriods = async () => {
    try {
      const res = await fetch("/api/pay-periods");
      if (res.ok) {
        const data = await res.json();
        setPayPeriods(data);
      }
    } catch (error) {
      console.error("Failed to fetch pay periods:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      startDate: "",
      endDate: "",
      payDate: "",
      notes: "",
    });
    setEditingPeriod(null);
    setError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    // Default to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setFormData({
      name: now.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      startDate: firstDay.toISOString().split("T")[0],
      endDate: lastDay.toISOString().split("T")[0],
      payDate: "",
      notes: "",
    });
    setShowDialog(true);
  };

  const openEditDialog = (period: PayPeriod) => {
    setEditingPeriod(period);
    setFormData({
      name: period.name,
      startDate: period.startDate.split("T")[0],
      endDate: period.endDate.split("T")[0],
      payDate: period.payDate?.split("T")[0] || "",
      notes: period.notes || "",
    });
    setError(null);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      setError("Name, start date, and end date are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingPeriod
        ? `/api/pay-periods/${editingPeriod.id}`
        : "/api/pay-periods";
      const method = editingPeriod ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate,
          payDate: formData.payDate || null,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        setShowDialog(false);
        resetForm();
        fetchPayPeriods();
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      setError("Failed to save pay period");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pay period?")) {
      return;
    }

    try {
      const res = await fetch(`/api/pay-periods/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchPayPeriods();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const isCurrentPeriod = (period: PayPeriod) => {
    const today = new Date();
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    return today >= start && today <= end;
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Pay Periods
              </CardTitle>
              <CardDescription>
                Define pay period cut-off dates so staff can see which hours count towards each payroll
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Period
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payPeriods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No pay periods defined</p>
              <p className="text-sm mt-1">Add pay periods so staff know when cut-off dates are</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payPeriods.map((period) => {
                const isCurrent = isCurrentPeriod(period);
                return (
                  <div
                    key={period.id}
                    className={`p-4 border rounded-lg ${isCurrent ? "border-green-500 bg-green-50" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{period.name}</span>
                          {isCurrent && (
                            <Badge variant="success">Current</Badge>
                          )}
                          {!period.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Period:</span>{" "}
                          {formatDate(new Date(period.startDate))} - {formatDate(new Date(period.endDate))}
                        </div>
                        {period.payDate && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Pay Date:</span>{" "}
                            {formatDate(new Date(period.payDate))}
                          </div>
                        )}
                        {period.notes && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            {period.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(period)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(period.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? "Edit Pay Period" : "Add Pay Period"}
            </DialogTitle>
            <DialogDescription>
              Set the cut-off dates for this pay period
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Period Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., January 2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payDate">Pay Date (optional)</Label>
              <Input
                id="payDate"
                type="date"
                value={formData.payDate}
                onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                When staff will receive payment for this period
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any notes about this pay period..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingPeriod ? "Save Changes" : "Add Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
