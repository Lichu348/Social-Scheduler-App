"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil } from "lucide-react";
import { EditTimeEntryDialog } from "@/components/edit-time-entry-dialog";

interface TimeEntry {
  id: string;
  clockIn: Date | string;
  clockOut: Date | string | null;
  notes: string | null;
  user: {
    id: string;
    name: string;
  };
}

interface TimesheetActionsProps {
  entry: TimeEntry;
}

export function TimesheetActions({ entry }: TimesheetActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const handleAction = async (status: "APPROVED" | "REJECTED") => {
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
      </div>
      <EditTimeEntryDialog
        entry={entry}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
