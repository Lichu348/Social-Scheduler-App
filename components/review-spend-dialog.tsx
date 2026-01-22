"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import {
  Wrench,
  Package,
  Settings,
  Megaphone,
  GraduationCap,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface SpendRequest {
  id: string;
  title: string;
  description: string | null;
  justification: string;
  amount: number;
  category: string;
  status: string;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  requestedBy: { id: string; name: string; email: string };
  reviewedBy: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
}

interface ReviewSpendDialogProps {
  request: SpendRequest;
}

const categoryIcons: Record<string, React.ReactNode> = {
  EQUIPMENT: <Wrench className="h-4 w-4" />,
  SUPPLIES: <Package className="h-4 w-4" />,
  MAINTENANCE: <Settings className="h-4 w-4" />,
  MARKETING: <Megaphone className="h-4 w-4" />,
  TRAINING: <GraduationCap className="h-4 w-4" />,
  OTHER: <MoreHorizontal className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  EQUIPMENT: "Equipment",
  SUPPLIES: "Supplies",
  MAINTENANCE: "Maintenance",
  MARKETING: "Marketing",
  TRAINING: "Training",
  OTHER: "Other",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

export function ReviewSpendDialog({ request }: ReviewSpendDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const handleReview = async (status: "APPROVED" | "REJECTED") => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/spend/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewNotes: reviewNotes || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setOpen(false);
        setReviewNotes("");
        router.refresh();
      } else {
        setError(data.error || `Failed to ${status.toLowerCase()} request`);
      }
    } catch (error) {
      console.error(`Failed to ${status.toLowerCase()} request:`, error);
      setError(`Failed to ${status.toLowerCase()} request. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Review Spend Request</DialogTitle>
          <DialogDescription>
            Review and approve or reject this spending request.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive flex-shrink-0">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Request Details */}
          <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-background">
                {categoryIcons[request.category]}
              </div>
              <span className="font-semibold text-lg">{request.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">{categoryLabels[request.category]}</Badge>
              {request.location && (
                <Badge variant="secondary">{request.location.name}</Badge>
              )}
            </div>

            <p className="text-3xl font-bold text-primary">
              {formatCurrency(request.amount)}
            </p>
          </div>

          {/* Requester Info */}
          <div className="space-y-1">
            <Label className="text-muted-foreground">Requested by</Label>
            <p className="font-medium">{request.requestedBy.name}</p>
            <p className="text-sm text-muted-foreground">{request.requestedBy.email}</p>
            <p className="text-sm text-muted-foreground">
              Submitted {formatDate(request.createdAt)}
            </p>
          </div>

          {/* Description */}
          {request.description && (
            <div className="space-y-1">
              <Label className="text-muted-foreground">Description</Label>
              <p className="text-sm">{request.description}</p>
            </div>
          )}

          {/* Justification */}
          <div className="space-y-1">
            <Label className="text-muted-foreground">Justification</Label>
            <p className="text-sm p-3 bg-muted rounded-md">{request.justification}</p>
          </div>

          {/* Review Notes */}
          <div className="space-y-2">
            <Label htmlFor="reviewNotes">Review Notes (optional)</Label>
            <Textarea
              id="reviewNotes"
              placeholder="Add notes for the requester..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleReview("REJECTED")}
            disabled={loading}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {loading ? "Processing..." : "Reject"}
          </Button>
          <Button
            type="button"
            onClick={() => handleReview("APPROVED")}
            disabled={loading}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {loading ? "Processing..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
