"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditShiftDialog } from "./edit-shift-dialog";
import { formatDate, formatTime, calculateHours } from "@/lib/utils";
import { Calendar, Clock, User, ArrowLeftRight, Trash2, Coffee, Tag, DollarSign, AlertTriangle, Pencil } from "lucide-react";

interface ShiftCategory {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
}

interface Location {
  id: string;
  name: string;
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
  location?: Location | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CertificationWarning {
  isValid: boolean;
  errorMessage: string | null;
  missingCertifications: { id: string; name: string }[];
  expiredCertifications: { id: string; name: string }[];
}

interface ShiftDetailDialogProps {
  shift: Shift;
  users: User[];
  currentUserId: string;
  isManager: boolean;
  categories?: ShiftCategory[];
  locations?: Location[];
  onClose: () => void;
}

export function ShiftDetailDialog({
  shift,
  users,
  currentUserId,
  isManager,
  categories = [],
  locations = [],
  onClose,
}: ShiftDetailDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newAssignee, setNewAssignee] = useState(shift.assignedTo?.id || "");
  const [certWarning, setCertWarning] = useState<CertificationWarning | null>(null);
  const [checkingCerts, setCheckingCerts] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const isMyShift = shift.assignedTo?.id === currentUserId;
  const hours = calculateHours(shift.startTime, shift.endTime);

  // Check certifications when reassignment selection changes
  useEffect(() => {
    const checkCertifications = async () => {
      // Only check if selecting a new user (not unassigning)
      if (!newAssignee || newAssignee === shift.assignedTo?.id) {
        setCertWarning(null);
        return;
      }

      setCheckingCerts(true);
      try {
        const res = await fetch(`/api/certifications/check?userId=${newAssignee}`);
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
  }, [newAssignee, shift.assignedTo?.id]);

  const handlePickupShift = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts/${shift.id}/pickup`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
        onClose();
      }
    } catch (error) {
      console.error("Failed to pickup shift:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDropShift = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/swap-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: shift.id,
          type: "drop",
        }),
      });
      if (res.ok) {
        router.refresh();
        onClose();
      }
    } catch (error) {
      console.error("Failed to request drop:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedToId: newAssignee || null,
        }),
      });
      if (res.ok) {
        router.refresh();
        onClose();
      }
    } catch (error) {
      console.error("Failed to reassign shift:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this shift?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
        onClose();
      }
    } catch (error) {
      console.error("Failed to delete shift:", error);
    } finally {
      setLoading(false);
    }
  };

  const userOptions = [
    { value: "", label: "Unassigned (Open Shift)" },
    ...users.map((user) => ({ value: user.id, label: user.name })),
  ];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {shift.title}
            {shift.isOpen && <Badge variant="warning">Open Shift</Badge>}
          </DialogTitle>
          <DialogDescription>Shift details and actions</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(shift.startTime)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatTime(shift.startTime)} - {formatTime(shift.endTime)} ({hours.toFixed(2)} hours total)
            </span>
          </div>
          {/* Hours breakdown box */}
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shift duration:</span>
              <span>{hours.toFixed(2)} hours</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Coffee className="h-3 w-3" />
                Unpaid break:
              </span>
              <span>{shift.scheduledBreakMinutes || 0} min</span>
            </div>
            <div className="flex justify-between text-sm font-medium border-t pt-1 mt-1">
              <span>Paid hours:</span>
              <span className="text-primary">
                {(hours - (shift.scheduledBreakMinutes || 0) / 60).toFixed(2)} hours
              </span>
            </div>
            {shift.category?.hourlyRate && (
              <div className="flex justify-between text-sm font-medium text-green-600">
                <span>Estimated pay:</span>
                <span>
                  ${((hours - (shift.scheduledBreakMinutes || 0) / 60) * shift.category.hourlyRate).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{shift.assignedTo?.name || "Unassigned"}</span>
          </div>
          {shift.category && (
            <div className="flex items-center gap-3 text-sm">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: shift.category.color }}
                />
                {shift.category.name}
              </span>
            </div>
          )}
          {shift.category?.hourlyRate && (
            <div className="flex items-center gap-3 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>${shift.category.hourlyRate.toFixed(2)}/hour</span>
            </div>
          )}
          {shift.description && (
            <p className="text-sm text-muted-foreground border-t pt-4">
              {shift.description}
            </p>
          )}

          {isManager && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium">Reassign Shift</p>
              <Select
                options={userOptions}
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
              />
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
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {shift.isOpen && !isManager && (
            <Button onClick={handlePickupShift} disabled={loading} className="w-full sm:w-auto">
              Pick Up Shift
            </Button>
          )}
          {isMyShift && (
            <Button
              variant="outline"
              onClick={handleDropShift}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Request Drop
            </Button>
          )}
          {isManager && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(true)}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleReassign}
                disabled={loading || newAssignee === (shift.assignedTo?.id || "") || (certWarning !== null && !certWarning.isValid)}
                className="w-full sm:w-auto"
              >
                Reassign
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Edit Dialog */}
      {showEditDialog && (
        <EditShiftDialog
          shift={shift}
          users={users}
          categories={categories}
          locations={locations}
          onClose={() => setShowEditDialog(false)}
          onSave={() => {
            setShowEditDialog(false);
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}
