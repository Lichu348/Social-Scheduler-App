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
  currentStaffRole: string;
}

export function TeamMemberActions({ userId, currentRole, currentStaffRole }: TeamMemberActionsProps) {
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

  const handleStaffRoleChange = async (newStaffRole: string) => {
    setLoading(true);
    try {
      await fetch(`/api/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffRole: newStaffRole }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update staff role:", error);
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
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuLabel>Permission Level</DropdownMenuLabel>
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
        {currentRole !== "DUTY_MANAGER" && (
          <DropdownMenuItem onClick={() => handleRoleChange("DUTY_MANAGER")}>
            <UserCog className="mr-2 h-4 w-4" />
            Make Duty Manager
          </DropdownMenuItem>
        )}
        {currentRole !== "EMPLOYEE" && (
          <DropdownMenuItem onClick={() => handleRoleChange("EMPLOYEE")}>
            <UserCog className="mr-2 h-4 w-4" />
            Make Employee
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Job Role</DropdownMenuLabel>
        {currentStaffRole !== "DESK" && (
          <DropdownMenuItem onClick={() => handleStaffRoleChange("DESK")}>
            Front Desk
          </DropdownMenuItem>
        )}
        {currentStaffRole !== "COACH" && (
          <DropdownMenuItem onClick={() => handleStaffRoleChange("COACH")}>
            Coach
          </DropdownMenuItem>
        )}
        {currentStaffRole !== "SETTER" && (
          <DropdownMenuItem onClick={() => handleStaffRoleChange("SETTER")}>
            Route Setter
          </DropdownMenuItem>
        )}
        {currentStaffRole !== "INSTRUCTOR" && (
          <DropdownMenuItem onClick={() => handleStaffRoleChange("INSTRUCTOR")}>
            Instructor
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
