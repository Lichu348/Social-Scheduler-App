"use client";

import { Badge } from "@/components/ui/badge";

interface StarterFormStatusBadgeProps {
  status: string | null;
}

export function StarterFormStatusBadge({ status }: StarterFormStatusBadgeProps) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not Started
      </Badge>
    );
  }

  switch (status) {
    case "INCOMPLETE":
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-500">
          In Progress
        </Badge>
      );
    case "SUBMITTED":
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-500">
          Submitted
        </Badge>
      );
    case "REVIEWED":
      return (
        <Badge variant="outline" className="text-green-600 border-green-500">
          Reviewed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Unknown
        </Badge>
      );
  }
}
