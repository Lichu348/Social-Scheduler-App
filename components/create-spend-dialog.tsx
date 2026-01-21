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

interface CreateSpendDialogProps {
  locations?: Location[];
}

const SPEND_CATEGORIES = [
  { value: "EQUIPMENT", label: "Equipment", description: "Gym equipment, holds, ropes" },
  { value: "SUPPLIES", label: "Supplies", description: "Consumables, cleaning, chalk" },
  { value: "MAINTENANCE", label: "Maintenance", description: "Repairs, servicing" },
  { value: "MARKETING", label: "Marketing", description: "Advertising, promotions" },
  { value: "TRAINING", label: "Training", description: "Staff training, certifications" },
  { value: "OTHER", label: "Other", description: "Miscellaneous" },
];

export function CreateSpendDialog({ locations = [] }: CreateSpendDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    justification: "",
    amount: "",
    category: "EQUIPMENT",
    locationId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          justification: formData.justification,
          amount,
          category: formData.category,
          locationId: formData.locationId || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setOpen(false);
        setFormData({
          title: "",
          description: "",
          justification: "",
          amount: "",
          category: "EQUIPMENT",
          locationId: "",
        });
        router.refresh();
      } else {
        setError(data.error || "Failed to create spend request");
      }
    } catch (error) {
      console.error("Failed to create spend request:", error);
      setError("Failed to create spend request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = SPEND_CATEGORIES.map((cat) => ({
    value: cat.value,
    label: cat.label,
  }));

  const locationOptions = [
    { value: "", label: "No specific location" },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Spend Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Spend Request</DialogTitle>
          <DialogDescription>
            Submit a spending request for admin approval. Provide clear justification for approval.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive mb-4">
              {error}
            </div>
          )}
          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., New climbing holds for bouldering wall"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (£)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g., 250.00"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  options={categoryOptions}
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              {SPEND_CATEGORIES.find((c) => c.value === formData.category)?.description}
            </p>

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
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What is being purchased? Supplier details, specifications..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification">Justification</Label>
              <Textarea
                id="justification"
                placeholder="Why is this purchase needed? What problem does it solve?"
                value={formData.justification}
                onChange={(e) =>
                  setFormData({ ...formData, justification: e.target.value })
                }
                required
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Provide a clear business reason to help with approval
              </p>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
