"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Calendar, Clock } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  defaultTitle?: string | null;
  categoryId?: string | null;
  category?: ShiftCategory | null;
}

interface CertificationWarning {
  isValid: boolean;
  errorMessage: string | null;
  missingCertifications: { id: string; name: string }[];
  expiredCertifications: { id: string; name: string }[];
}

interface Shift {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  isOpen: boolean;
  scheduledBreakMinutes?: number;
  assignedTo: { id: string; name: string; email: string } | null;
  category?: ShiftCategory | null;
}

interface QuickAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ShiftTemplate | null;
  targetDate: Date | null;
  users: User[];
  locationId?: string | null;
  defaultUserId?: string | null;
  onSuccess?: () => void;
  onShiftCreated?: (shift: Shift) => void;
  onShiftConfirmed?: (tempId: string, serverShift: Shift) => void;
  onShiftRollback?: (tempId: string) => void;
}

export function QuickAssignDialog({
  open,
  onOpenChange,
  template,
  targetDate,
  users,
  locationId,
  defaultUserId,
  onSuccess,
  onShiftCreated,
  onShiftConfirmed,
  onShiftRollback,
}: QuickAssignDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignedToId, setAssignedToId] = useState("");
  const [certWarning, setCertWarning] = useState<CertificationWarning | null>(null);
  const [checkingCerts, setCheckingCerts] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setAssignedToId(defaultUserId || "");
      setError(null);
      setCertWarning(null);
    }
  }, [open, defaultUserId]);

  // Check certifications when user selection changes
  useEffect(() => {
    const checkCertifications = async () => {
      if (!assignedToId) {
        setCertWarning(null);
        return;
      }

      setCheckingCerts(true);
      try {
        const res = await fetch(`/api/certifications/check?userId=${assignedToId}`);
        if (res.ok) {
          const data = await res.json();
          setCertWarning(data);
        }
      } catch (error) {
        console.error("Failed to check certifications:", error);
      } finally {
        setCheckingCerts(false);
      }
    };
    checkCertifications();
  }, [assignedToId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || !targetDate) return;

    setLoading(true);
    setError(null);

    // Build the datetime from date and template times
    const dateStr = targetDate.toISOString().split("T")[0];
    const startDateTime = new Date(`${dateStr}T${template.startTime}`);
    const endDateTime = new Date(`${dateStr}T${template.endTime}`);

    // Handle overnight shifts
    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    // Find the assigned user info for the optimistic update
    const assignedUser = assignedToId
      ? users.find((u) => u.id === assignedToId)
      : null;

    // Generate a temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create optimistic shift
    const optimisticShift: Shift = {
      id: tempId,
      title: template.defaultTitle || template.name,
      description: null,
      startTime: startDateTime,
      endTime: endDateTime,
      status: "SCHEDULED",
      isOpen: !assignedToId,
      assignedTo: assignedUser
        ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email }
        : null,
      category: template.category || null,
      scheduledBreakMinutes: 0,
    };

    // Optimistically add the shift
    onShiftCreated?.(optimisticShift);

    // Close the dialog immediately for better UX
    onOpenChange(false);
    onSuccess?.();

    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: template.defaultTitle || template.name,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          assignedToId: assignedToId || null,
          categoryId: template.categoryId || null,
          templateId: template.id,
          locationId: locationId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        // Rollback the optimistic update
        onShiftRollback?.(tempId);
        setError(data.error || "Failed to create shift");
        onOpenChange(true); // Reopen dialog to show error
        return;
      }

      const serverShift = await res.json();
      // Confirm the optimistic update with server data
      onShiftConfirmed?.(tempId, {
        ...serverShift,
        startTime: new Date(serverShift.startTime),
        endTime: new Date(serverShift.endTime),
      });
    } catch (err) {
      // Rollback the optimistic update
      onShiftRollback?.(tempId);
      setError("Failed to create shift");
      onOpenChange(true); // Reopen dialog to show error
    } finally {
      setLoading(false);
    }
  };

  const userOptions = [
    { value: "", label: "Unassigned (Open Shift)" },
    ...users.map((user) => ({ value: user.id, label: user.name })),
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Shift from Template</DialogTitle>
          <DialogDescription>
            Create a new shift using the "{template?.name}" template
          </DialogDescription>
        </DialogHeader>

        {template && targetDate && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="p-3 bg-muted rounded-md space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatDate(targetDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {template.startTime} - {template.endTime}
                  </span>
                </div>
                {template.category && (
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: template.category.color }}
                    />
                    <span>{template.category.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignTo">Assign To (optional)</Label>
                <Select
                  id="assignTo"
                  options={userOptions}
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave unassigned to create an open shift
                </p>
              </div>

              {/* Certification warning */}
              {checkingCerts && (
                <div className="text-sm text-muted-foreground">
                  Checking certifications...
                </div>
              )}
              {certWarning && !certWarning.isValid && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Certification Warning
                    </p>
                    <p className="text-amber-700 dark:text-amber-300">
                      {certWarning.errorMessage}
                    </p>
                    <p className="text-amber-600 dark:text-amber-400 text-xs">
                      This staff member cannot be assigned until certifications are up to date.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || (certWarning !== null && !certWarning.isValid && !!assignedToId)}
              >
                {loading ? "Creating..." : "Create Shift"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
