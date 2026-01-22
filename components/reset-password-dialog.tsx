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
import { KeyRound, Copy, Check } from "lucide-react";

interface ResetPasswordDialogProps {
  userId: string;
  userName: string;
}

export function ResetPasswordDialog({ userId, userName }: ResetPasswordDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/team/${userId}/reset-password`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setTempPassword(data.tempPassword);
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
    setError(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Reset password">
          <KeyRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            {tempPassword
              ? `New temporary password for ${userName}`
              : `Reset password for ${userName}?`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {tempPassword ? (
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
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4">
          {tempPassword ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleReset} disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
