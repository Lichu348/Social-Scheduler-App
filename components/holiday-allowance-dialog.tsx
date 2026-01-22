"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palmtree } from "lucide-react";

interface HolidayAllowanceDialogProps {
  userId: string;
  userName: string;
  currentBalance: number;
}

export function HolidayAllowanceDialog({
  userId,
  userName,
  currentBalance,
}: HolidayAllowanceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState(currentBalance);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    if (balance < 0) {
      setError("Balance cannot be negative");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holidayBalance: balance }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update holiday allowance");
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
      setBalance(currentBalance);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Edit holiday allowance">
          <Palmtree className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Holiday Allowance</DialogTitle>
          <DialogDescription>
            Update holiday balance for {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="balance">Current Balance (hours)</Label>
            <Input
              id="balance"
              type="number"
              min="0"
              step="1"
              placeholder="e.g., 200"
              value={balance}
              onChange={(e) => setBalance(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              The remaining holiday hours available for this staff member
            </p>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Quick set:</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBalance(160)}
              >
                160h (20 days)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBalance(200)}
              >
                200h (25 days)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBalance(224)}
              >
                224h (28 days)
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
