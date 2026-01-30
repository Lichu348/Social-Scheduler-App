"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KeyRound, Copy, Check, Mail, Eye } from "lucide-react";

interface ResetPasswordDialogProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export function ResetPasswordDialog({ userId, userName, userEmail }: ResetPasswordDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReset = async (sendEmail: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/team/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      if (sendEmail) {
        setEmailSent(true);
        setTempPassword(null);
      } else {
        setTempPassword(data.tempPassword);
        setEmailSent(false);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (tempPassword) {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTempPassword(null);
    setEmailSent(false);
    setError(null);
    setCopied(false);
  };

  const isComplete = tempPassword || emailSent;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Reset password">
          <KeyRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            {isComplete
              ? `Password reset for ${userName}`
              : `Reset password for ${userName}?`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {emailSent ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 font-medium mb-2">
                  Password reset and emailed!
                </p>
                <p className="text-xs text-green-600">
                  A new temporary password has been sent to {userEmail}. They should change it after logging in.
                </p>
              </div>
            </div>
          ) : tempPassword ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 font-medium mb-2">
                  Password reset successfully!
                </p>
                <p className="text-xs text-green-600">
                  Share this temporary password securely with the staff member.
                  They should change it after logging in.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
                  {tempPassword}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will generate a new temporary password for {userName}.
                They will need to use this password to log in and should change it
                in their settings.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> {userEmail}
              </p>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4">
          {isComplete ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button variant="outline" onClick={handleClose} disabled={loading} className="sm:order-1">
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReset(false)}
                disabled={loading}
                className="sm:order-2"
              >
                <Eye className="h-4 w-4 mr-2" />
                {loading ? "Resetting..." : "Show Password"}
              </Button>
              <Button
                onClick={() => handleReset(true)}
                disabled={loading}
                className="sm:order-3"
              >
                <Mail className="h-4 w-4 mr-2" />
                {loading ? "Sending..." : "Email Password"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
