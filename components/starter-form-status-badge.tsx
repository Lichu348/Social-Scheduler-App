"use client";

import { Badge } from "@/components/ui/badge";

interface StarterFormStatusBadgeProps {
  status: string | null;
}

export function StarterFormStatusBadge({ status }: StarterFormStatusBadgeProps) {
  if (!status) {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-600">
        Not Started
      </Badge>
    );
  }

  switch (status) {
    case "INCOMPLETE":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          In Progress
        </Badge>
      );
    case "SUBMITTED":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Submitted
        </Badge>
      );
    case "REVIEWED":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Reviewed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600">
          Unknown
        </Badge>
      );
  }
}
