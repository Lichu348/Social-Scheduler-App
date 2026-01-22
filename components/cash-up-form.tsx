"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
import { Plus, Calculator, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
}

interface CashUpSession {
  id: string;
  date: string;
  locationId: string;
  location: Location;
  expectedCash: number;
  expectedPdq: number;
  actualCash: number;
  actualPdq: number;
  cashDiscrepancy: number;
  cardDiscrepancy: number;
  totalDiscrepancy: number;
  notes: string | null;
  status: string;
  completedBy: { id: string; name: string } | null;
  completedAt: string | null;
  reviewedBy: { id: string; name: string } | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

export function CashUpForm() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CashUpSession[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterLocationId, setFilterLocationId] = useState("");

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    locationId: "",
    expectedCash: "",
    expectedPdq: "",
    actualCash: "",
    actualPdq: "",
    notes: "",
  });

  useEffect(() => {
    fetchLocations();
    fetchSessions();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [filterLocationId]);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations?activeOnly=true");
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  };

  const fetchSessions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterLocationId) {
        params.append("locationId", filterLocationId);
      }
      const res = await fetch(`/api/cash-up?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      locationId: filterLocationId || "",
      expectedCash: "",
      expectedPdq: "",
      actualCash: "",
      actualPdq: "",
      notes: "",
    });
    setError(null);
  };

  const handleSave = async (submit: boolean) => {
    if (!formData.date || !formData.locationId) {
      setError("Date and location are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/cash-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formData.date,
          locationId: formData.locationId,
          notes: formData.notes,
          expectedCash: parseFloat(formData.expectedCash) || 0,
          expectedPdq: parseFloat(formData.expectedPdq) || 0,
          actualCash: parseFloat(formData.actualCash) || 0,
          actualPdq: parseFloat(formData.actualPdq) || 0,
          status: submit ? "SUBMITTED" : "DRAFT",
        }),
      });

      if (res.ok) {
        setShowDialog(false);
        resetForm();
        fetchSessions();
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      setError("Failed to save cash up");
    } finally {
      setSaving(false);
    }
  };

  // Calculate live discrepancies
  const expectedCash = parseFloat(formData.expectedCash) || 0;
  const expectedPdq = parseFloat(formData.expectedPdq) || 0;
  const actualCash = parseFloat(formData.actualCash) || 0;
  const actualPdq = parseFloat(formData.actualPdq) || 0;

  const cashDiscrepancy = actualCash - expectedCash;
  const cardDiscrepancy = actualPdq - expectedPdq;
  const totalDiscrepancy = cashDiscrepancy + cardDiscrepancy;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary">Draft</Badge>;
      case "SUBMITTED":
        return <Badge variant="warning">Submitted</Badge>;
      case "REVIEWED":
        return <Badge variant="success">Reviewed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const getDiscrepancyColor = (amount: number) => {
    if (amount === 0) return "text-muted-foreground";
    if (Math.abs(amount) < 5) return "text-amber-600";
    return amount > 0 ? "text-green-600" : "text-red-600";
  };

  const locationOptions = [
    { value: "", label: "Select location..." },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  const filterOptions = [
    { value: "", label: "All Locations" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                End of Day Cash Up
              </CardTitle>
              <CardDescription>
                Daily reconciliation of cash, card, and online takings
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Cash Up
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="mb-4">
            <Select
              options={filterOptions}
              value={filterLocationId}
              onChange={(e) => setFilterLocationId(e.target.value)}
              className="w-[200px]"
            />
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No cash up sessions yet</p>
              <p className="text-sm mt-1">Start by creating a new end of day cash up</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{session.location.name}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(new Date(session.date))}
                        </span>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cash:</span>{" "}
                          <span className="font-medium">{formatCurrency(session.actualCash)}</span>
                          <span className={cn("ml-1", getDiscrepancyColor(session.cashDiscrepancy))}>
                            ({session.cashDiscrepancy >= 0 ? "+" : ""}{formatCurrency(session.cashDiscrepancy)})
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">PDQ:</span>{" "}
                          <span className="font-medium">{formatCurrency(session.actualPdq)}</span>
                          <span className={cn("ml-1", getDiscrepancyColor(session.cardDiscrepancy))}>
                            ({session.cardDiscrepancy >= 0 ? "+" : ""}{formatCurrency(session.cardDiscrepancy)})
                          </span>
                        </div>
                        <div className={cn("font-medium", getDiscrepancyColor(session.totalDiscrepancy))}>
                          {session.totalDiscrepancy === 0 ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              Balanced
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4" />
                              {session.totalDiscrepancy >= 0 ? "+" : ""}{formatCurrency(session.totalDiscrepancy)}
                            </span>
                          )}
                        </div>
                      </div>
                      {session.completedBy && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Completed by {session.completedBy.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Cash Up Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>End of Day Cash Up</DialogTitle>
            <DialogDescription>
              Enter expected and actual values for daily reconciliation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Select
                  id="location"
                  options={locationOptions}
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                />
              </div>
            </div>

            {/* Expected Values */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <Label className="text-base font-semibold">Expected Values (from till)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="expectedCash" className="text-xs">Cash</Label>
                  <Input
                    id="expectedCash"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.expectedCash}
                    onChange={(e) => setFormData({ ...formData, expectedCash: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="expectedPdq" className="text-xs">PDQ/Card</Label>
                  <Input
                    id="expectedPdq"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.expectedPdq}
                    onChange={(e) => setFormData({ ...formData, expectedPdq: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Actual Values */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-3">
              <Label className="text-base font-semibold">Actual Values (Counted)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="actualCash" className="text-xs">Cash</Label>
                  <Input
                    id="actualCash"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.actualCash}
                    onChange={(e) => setFormData({ ...formData, actualCash: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="actualPdq" className="text-xs">PDQ/Card</Label>
                  <Input
                    id="actualPdq"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.actualPdq}
                    onChange={(e) => setFormData({ ...formData, actualPdq: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Discrepancies Summary */}
            <div className="p-4 border rounded-lg space-y-2">
              <Label className="text-base font-semibold">Discrepancies</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cash</p>
                  <p className={cn("text-lg font-bold", getDiscrepancyColor(cashDiscrepancy))}>
                    {cashDiscrepancy >= 0 ? "+" : ""}{formatCurrency(cashDiscrepancy)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Card</p>
                  <p className={cn("text-lg font-bold", getDiscrepancyColor(cardDiscrepancy))}>
                    {cardDiscrepancy >= 0 ? "+" : ""}{formatCurrency(cardDiscrepancy)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className={cn("text-xl font-bold", getDiscrepancyColor(totalDiscrepancy))}>
                    {totalDiscrepancy >= 0 ? "+" : ""}{formatCurrency(totalDiscrepancy)}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any notes about discrepancies or unusual activity..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
                Save as Draft
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving}>
                {saving ? "Saving..." : "Submit"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
