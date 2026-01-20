"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface MaintenanceCheckFormProps {
  checkType: {
    id: string;
    name: string;
    frequencyDays: number;
  };
  location: {
    id: string;
    name: string;
  };
  userName: string;
  onClose: () => void;
  onComplete: () => void;
}

type CheckStatus = "PASS" | "FAIL" | "NEEDS_ATTENTION";

export function MaintenanceCheckForm({
  checkType,
  location,
  userName,
  onClose,
  onComplete,
}: MaintenanceCheckFormProps) {
  const [status, setStatus] = useState<CheckStatus>("PASS");
  const [notes, setNotes] = useState("");
  const [issues, setIssues] = useState("");
  const [signature, setSignature] = useState(userName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!signature.trim()) {
      setError("Signature is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkTypeId: checkType.id,
          locationId: location.id,
          status,
          notes: notes.trim() || null,
          issues: issues.trim() ? [issues.trim()] : null,
          signature: signature.trim(),
        }),
      });

      if (res.ok) {
        onComplete();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save check");
      }
    } catch (err) {
      setError("Failed to save check");
    } finally {
      setSaving(false);
    }
  };

  const statusOptions: { value: CheckStatus; label: string; icon: typeof CheckCircle2; color: string }[] = [
    {
      value: "PASS",
      label: "Pass",
      icon: CheckCircle2,
      color: "text-green-600 border-green-600 bg-green-50",
    },
    {
      value: "NEEDS_ATTENTION",
      label: "Needs Attention",
      icon: AlertTriangle,
      color: "text-amber-600 border-amber-600 bg-amber-50",
    },
    {
      value: "FAIL",
      label: "Fail",
      icon: XCircle,
      color: "text-red-600 border-red-600 bg-red-50",
    },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Maintenance Check</DialogTitle>
          <DialogDescription>
            {checkType.name} at {location.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Selection */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors",
                      isSelected
                        ? option.color
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                  >
                    <Icon className={cn("h-6 w-6", isSelected ? "" : "text-muted-foreground")} />
                    <span className={cn("text-sm font-medium", isSelected ? "" : "text-muted-foreground")}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations or comments..."
              rows={2}
            />
          </div>

          {/* Issues (shown for non-pass statuses) */}
          {status !== "PASS" && (
            <div className="space-y-2">
              <Label htmlFor="issues">
                Issue Description {status === "FAIL" && "(Required)"}
              </Label>
              <Textarea
                id="issues"
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                placeholder="Describe the issue or what needs attention..."
                rows={3}
                className={cn(
                  status === "FAIL" && !issues.trim() && "border-red-300"
                )}
              />
              {status === "FAIL" && !issues.trim() && (
                <p className="text-sm text-red-600">
                  Please describe the issue when marking as Fail
                </p>
              )}
            </div>
          )}

          {/* Signature */}
          <div className="space-y-2">
            <Label htmlFor="signature">Your Signature (Required)</Label>
            <Input
              id="signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your name to sign off"
              className={cn(!signature.trim() && "border-red-300")}
            />
            <p className="text-xs text-muted-foreground">
              By signing, you confirm this check was completed accurately
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !signature.trim() || (status === "FAIL" && !issues.trim())}
          >
            {saving ? "Saving..." : "Submit Check"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
