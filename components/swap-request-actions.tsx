"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface SwapRequestActionsProps {
  requestId: string;
  isManager: boolean;
  isOwner: boolean;
}

export function SwapRequestActions({
  requestId,
  isManager,
  isOwner,
}: SwapRequestActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAction = async (status: "APPROVED" | "REJECTED" | "CANCELLED") => {
    setLoading(true);
    try {
      if (status === "CANCELLED") {
        await fetch(`/api/swap-requests/${requestId}`, {
          method: "DELETE",
        });
      } else {
        await fetch(`/api/swap-requests/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      }
      router.refresh();
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {isManager && (
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
      {isOwner && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("CANCELLED")}
          disabled={loading}
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
