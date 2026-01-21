"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeftRight, Trash2, MoreVertical } from "lucide-react";

interface MobileSwapDropDialogProps {
  shiftId: string;
  shiftTitle: string;
  shiftDate: string;
}

export function MobileSwapDropDialog({ shiftId, shiftTitle, shiftDate }: MobileSwapDropDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<"swap" | "drop" | null>(null);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!requestType) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/swap-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId,
          type: requestType,
          message: message || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setOpen(false);
        setRequestType(null);
        setMessage("");
        router.refresh();
      } else {
        setError(data.error || "Failed to create request");
      }
    } catch {
      setError("Failed to create request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setRequestType(null);
    setMessage("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {requestType === null ? "Shift Options" : requestType === "swap" ? "Request Swap" : "Request Drop"}
          </DialogTitle>
          <DialogDescription>
            {shiftTitle} - {shiftDate}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
            {error}
          </div>
        )}

        {requestType === null ? (
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full h-14 justify-start gap-3"
              onClick={() => setRequestType("swap")}
            >
              <ArrowLeftRight className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Request Swap</p>
                <p className="text-xs text-muted-foreground">Ask to swap with another staff member</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 justify-start gap-3 text-destructive hover:text-destructive"
              onClick={() => setRequestType("drop")}
            >
              <Trash2 className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Request Drop</p>
                <p className="text-xs text-muted-foreground">Ask to be removed from this shift</p>
              </div>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">
                Reason {requestType === "drop" ? "(recommended)" : "(optional)"}
              </Label>
              <Textarea
                id="message"
                placeholder={
                  requestType === "swap"
                    ? "e.g., I have a conflict, looking to swap with someone on Wednesday..."
                    : "e.g., Medical appointment, family emergency..."
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {requestType === "swap"
                ? "A manager will review your request and help find a swap."
                : "A manager will review your drop request. The shift may be offered to other staff."}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {requestType !== null && (
            <Button variant="outline" onClick={() => setRequestType(null)} disabled={loading}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          {requestType !== null && (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              variant={requestType === "drop" ? "destructive" : "default"}
            >
              {loading ? "Submitting..." : `Request ${requestType === "swap" ? "Swap" : "Drop"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
