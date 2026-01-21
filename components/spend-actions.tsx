"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface SpendActionsProps {
  requestId: string;
  isOwner: boolean;
}

export function SpendActions({ requestId, isOwner }: SpendActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to cancel this spend request?")) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/spend/${requestId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete request");
      }
    } catch (error) {
      console.error("Failed to delete request:", error);
      alert("Failed to delete request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
