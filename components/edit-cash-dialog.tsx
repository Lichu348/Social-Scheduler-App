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
import { Pencil, Trash2 } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface CashTransaction {
  id: string;
  type: string;
  amount: number;
  notes: string | null;
  createdAt: Date;
  loggedBy: { id: string; name: string };
  location: { id: string; name: string } | null;
}

interface EditCashDialogProps {
  transaction: CashTransaction;
  locations?: Location[];
  isAdmin: boolean;
}

const TRANSACTION_TYPES = [
  { value: "TAKING", label: "Cash Received" },
  { value: "BANKING", label: "Banking" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export function EditCashDialog({ transaction, locations = [], isAdmin }: EditCashDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: transaction.type,
    amount: Math.abs(transaction.amount).toString(),
    notes: transaction.notes || "",
    locationId: transaction.location?.id || "",
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
      const res = await fetch(`/api/cash/${transaction.id}`, {
        method: "PATCH",
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
        router.refresh();
      } else {
        setError(data.error || "Failed to update transaction");
      }
    } catch (error) {
      console.error("Failed to update transaction:", error);
      setError("Failed to update transaction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this transaction? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/cash/${transaction.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      setError("Failed to delete transaction. Please try again.");
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

  const isOutgoing = formData.type === "BANKING" || formData.type === "PURCHASE";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update or correct this cash transaction.
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
              <Label htmlFor="edit-type">Transaction Type</Label>
              <Select
                id="edit-type"
                options={typeOptions}
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">
                Amount (£) {isOutgoing && <span className="text-muted-foreground">(will be deducted)</span>}
              </Label>
              <Input
                id="edit-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>

            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Select
                  id="edit-location"
                  options={locationOptions}
                  value={formData.locationId}
                  onChange={(e) =>
                    setFormData({ ...formData, locationId: e.target.value })
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {isAdmin && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="mr-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
