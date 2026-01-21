"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil, RotateCcw } from "lucide-react";
import { EditTimeEntryDialog } from "@/components/edit-time-entry-dialog";

interface TimeEntry {
  id: string;
  clockIn: Date | string;
  clockOut: Date | string | null;
  notes: string | null;
  status: string;
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

  const isPending = entry.status === "PENDING";
  const isApproved = entry.status === "APPROVED";
  const isRejected = entry.status === "REJECTED";

  return (
    <>
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
      <EditTimeEntryDialog
        entry={entry}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
