"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PoundSterling } from "lucide-react";
import { UserRatesEditor } from "./user-rates-editor";

interface UserRatesDialogProps {
  userId: string;
  userName: string;
}

export function UserRatesDialog({ userId, userName }: UserRatesDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PoundSterling className="h-4 w-4 mr-1" />
          Rates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay Rates - {userName}</DialogTitle>
          <DialogDescription>
            Set custom hourly rates for each shift category
          </DialogDescription>
        </DialogHeader>
        <UserRatesEditor userId={userId} userName={userName} />
      </DialogContent>
    </Dialog>
  );
}
