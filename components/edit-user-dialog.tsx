"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

interface EditUserDialogProps {
  userId: string;
  currentName: string;
  currentEmail: string;
  currentContractedHours?: number | null;
  currentSortOrder?: number;
}

export function EditUserDialog({
  userId,
  currentName,
  currentEmail,
  currentContractedHours,
  currentSortOrder = 0,
}: EditUserDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [contractedHours, setContractedHours] = useState<string>(
    currentContractedHours?.toString() || ""
  );
  const [sortOrder, setSortOrder] = useState(currentSortOrder.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      setLoading(false);
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Valid email is required");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          contractedHours: contractedHours ? parseFloat(contractedHours) : null,
          sortOrder: parseInt(sortOrder) || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update user");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset to current values when opening
      setName(currentName);
      setEmail(currentEmail);
      setContractedHours(currentContractedHours?.toString() || "");
      setSortOrder(currentSortOrder.toString());
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Edit user details">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit User Details</DialogTitle>
          <DialogDescription>
            Update name and email address
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractedHours">Contracted Hours (per week)</Label>
            <Input
              id="contractedHours"
              type="number"
              step="0.5"
              min="0"
              max="168"
              placeholder="e.g., 40 for full-time"
              value={contractedHours}
              onChange={(e) => setContractedHours(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank if no contracted hours. Used to show scheduled vs contracted on the schedule.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              min="0"
              placeholder="0 = top of list"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers appear first on the schedule. Use this to put managers at the top.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
