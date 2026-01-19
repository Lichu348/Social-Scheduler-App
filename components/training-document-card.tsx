"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TrainingDocument {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  validityMonths: number;
  isRequired: boolean;
  requiredForRoles: string[];
  createdAt: Date;
  userSignoff: {
    signedAt: Date;
    expiresAt: Date;
  } | null;
  signoffStatus: "not_signed" | "signed" | "expired";
  isRequiredForUser: boolean;
  totalSignoffs: number;
}

interface TrainingDocumentCardProps {
  document: TrainingDocument;
  isAdmin: boolean;
}

export function TrainingDocumentCard({ document, isAdmin }: TrainingDocumentCardProps) {
  const router = useRouter();
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signature, setSignature] = useState("");
  const [signing, setSigning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSign = async () => {
    if (!signature.trim()) return;

    setSigning(true);
    try {
      const res = await fetch(`/api/training/${document.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: signature.trim() }),
      });

      if (res.ok) {
        setShowSignDialog(false);
        setSignature("");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to sign document:", error);
    } finally {
      setSigning(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this training document? All signoffs will be lost.")) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/training/${document.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = () => {
    switch (document.signoffStatus) {
      case "signed":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Signed
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Expired - Re-sign Required
          </Badge>
        );
      default:
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" />
            Needs Signing
          </Badge>
        );
    }
  };

  return (
    <>
      <Card className={document.signoffStatus !== "signed" && document.isRequiredForUser ? "border-amber-200 dark:border-amber-800" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{document.title}</CardTitle>
            </div>
            {document.isRequired && (
              <Badge variant="outline" className="text-xs">Required</Badge>
            )}
          </div>
          {document.description && (
            <CardDescription className="text-sm mt-1">
              {document.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pb-2">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status:</span>
              {getStatusBadge()}
            </div>
            {document.userSignoff && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Signed:</span>
                  <span>{formatDate(document.userSignoff.signedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Expires:</span>
                  <span>{formatDate(document.userSignoff.expiresAt)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valid for:</span>
              <span>{document.validityMonths} months</span>
            </div>
            {isAdmin && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total signoffs:</span>
                <span>{document.totalSignoffs}</span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => window.open(document.fileUrl, "_blank")}
          >
            <Download className="h-4 w-4 mr-1" />
            View
          </Button>
          {document.signoffStatus !== "signed" && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => setShowSignDialog(true)}
            >
              Sign Document
            </Button>
          )}
          {document.signoffStatus === "signed" && (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setShowSignDialog(true)}
            >
              Re-sign
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Sign Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Training Document</DialogTitle>
            <DialogDescription>
              By signing below, you confirm that you have read and understood the training document: &quot;{document.title}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Document: {document.title}</p>
              <p className="text-sm text-muted-foreground mb-3">{document.description}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(document.fileUrl, "_blank")}
              >
                <Download className="h-4 w-4 mr-1" />
                Open Document
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signature">Type your full name as signature</Label>
              <Input
                id="signature"
                placeholder="Your full name"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This digital signature will be recorded with the current date and time.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={signing || !signature.trim()}>
              {signing ? "Signing..." : "Confirm Sign-off"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
