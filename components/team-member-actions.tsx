"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserCog, Trash2 } from "lucide-react";

interface TeamMemberActionsProps {
  userId: string;
  currentRole: string;
}

export function TeamMemberActions({ userId, currentRole }: TeamMemberActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRoleChange = async (newRole: string) => {
    setLoading(true);
    try {
      await fetch(`/api/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    setLoading(true);
    try {
      await fetch(`/api/team/${userId}`, {
        method: "DELETE",
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to remove user:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={loading}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {currentRole !== "ADMIN" && (
          <DropdownMenuItem onClick={() => handleRoleChange("ADMIN")}>
            <UserCog className="mr-2 h-4 w-4" />
            Make Admin
          </DropdownMenuItem>
        )}
        {currentRole !== "MANAGER" && (
          <DropdownMenuItem onClick={() => handleRoleChange("MANAGER")}>
            <UserCog className="mr-2 h-4 w-4" />
            Make Manager
          </DropdownMenuItem>
        )}
        {currentRole !== "EMPLOYEE" && (
          <DropdownMenuItem onClick={() => handleRoleChange("EMPLOYEE")}>
            <UserCog className="mr-2 h-4 w-4" />
            Make Employee
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={handleRemove}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
