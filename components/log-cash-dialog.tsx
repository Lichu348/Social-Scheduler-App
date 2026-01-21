"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface LogCashDialogProps {
  locations?: Location[];
}

const TRANSACTION_TYPES = [
  { value: "TAKING", label: "Cash Received", description: "Cash received from customers" },
  { value: "BANKING", label: "Banking", description: "Cash taken to the bank" },
  { value: "PURCHASE", label: "Purchase", description: "Cash used to buy something" },
  { value: "ADJUSTMENT", label: "Adjustment", description: "Correct the cash total" },
];

export function LogCashDialog({ locations = [] }: LogCashDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: "TAKING",
    amount: "",
    notes: "",
    locationId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount === 0) {
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          amount,
          notes: formData.notes || null,
          locationId: formData.locationId || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setOpen(false);
        setFormData({
          type: "TAKING",
          amount: "",
          notes: "",
          locationId: "",
        });
        router.refresh();
      } else {
        setError(data.error || "Failed to log cash transaction");
      }
    } catch (error) {
      console.error("Failed to log cash transaction:", error);
      setError("Failed to log cash transaction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = TRANSACTION_TYPES.map((t) => ({
    value: t.value,
    label: t.label,
  }));

  const locationOptions = [
    { value: "", label: "No specific location" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  const selectedType = TRANSACTION_TYPES.find((t) => t.value === formData.type);
  const isOutgoing = formData.type === "BANKING" || formData.type === "PURCHASE";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Log Cash
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Cash Transaction</DialogTitle>
          <DialogDescription>
            Record cash coming in or going out of the building.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive mb-4">
              {error}
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type</Label>
              <Select
                id="type"
                options={typeOptions}
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                {selectedType?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount (£) {isOutgoing && <span className="text-muted-foreground">(will be deducted)</span>}
              </Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g., 150.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>

            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Select
                  id="location"
                  options={locationOptions}
                  value={formData.locationId}
                  onChange={(e) =>
                    setFormData({ ...formData, locationId: e.target.value })
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder={
                  formData.type === "TAKING"
                    ? "e.g., Morning session takings, Day pass sales..."
                    : formData.type === "BANKING"
                    ? "e.g., Weekly banking run..."
                    : formData.type === "PURCHASE"
                    ? "e.g., Emergency cleaning supplies from Tesco..."
                    : "e.g., Correction for miscounted float..."
                }
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Explain what this cash transaction is for
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Logging..." : "Log Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
