"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil, RotateCcw, Clock, AlertTriangle } from "lucide-react";
import { EditTimeEntryDialog } from "@/components/edit-time-entry-dialog";

interface TimeEntry {
  id: string;
  clockIn: Date | string;
  clockOut: Date | string | null;
  notes: string | null;
  status: string;
  clockInFlag?: string | null;
  clockInApproved?: boolean;
  user: {
    id: string;
    name: string;
  };
}

interface TimesheetActionsProps {
  entry: TimeEntry;
  showApprovalActions?: boolean;
}

export function TimesheetActions({ entry, showApprovalActions = true }: TimesheetActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const handleAction = async (status: "APPROVED" | "REJECTED" | "PENDING") => {
    setLoading(true);
    try {
      await fetch(`/api/time-entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockInApproval = async (approve: boolean) => {
    setLoading(true);
    try {
      await fetch(`/api/time-entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approve ? { approveClockIn: true } : { rejectClockIn: true }),
      });
      router.refresh();
    } catch (error) {
      console.error("Clock-in approval failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const isPending = entry.status === "PENDING";
  const isApproved = entry.status === "APPROVED";
  const isRejected = entry.status === "REJECTED";
  const needsClockInApproval = entry.clockInFlag && !entry.clockInApproved;

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Clock-in approval actions */}
        {showApprovalActions && needsClockInApproval && (
          <div className="flex gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-center gap-1 text-amber-700 text-xs">
              <AlertTriangle className="h-3 w-3" />
              {entry.clockInFlag === "EARLY" ? "Early" : "Late"} clock-in
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClockInApproval(true)}
              disabled={loading}
              className="h-7 text-xs"
            >
              <Check className="mr-1 h-3 w-3" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleClockInApproval(false)}
              disabled={loading}
              className="h-7 text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              Reject
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
            disabled={loading}
          >
            <Pencil className="mr-1 h-4 w-4" />
            Edit
          </Button>

          {showApprovalActions && isPending && (
            <>
              <Button
                size="sm"
                onClick={() => handleAction("APPROVED")}
                disabled={loading}
              >
                <Check className="mr-1 h-4 w-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction("REJECTED")}
                disabled={loading}
              >
                <X className="mr-1 h-4 w-4" />
                Reject
              </Button>
            </>
          )}

          {showApprovalActions && (isApproved || isRejected) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("PENDING")}
              disabled={loading}
              title="Revert to pending for re-review"
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              Unapprove
            </Button>
          )}
        </div>
      </div>
      <EditTimeEntryDialog
        entry={entry}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
