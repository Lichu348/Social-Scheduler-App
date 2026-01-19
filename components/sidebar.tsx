"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  MessageSquare,
  Users,
  Palmtree,
  Settings,
  LogOut,
  Home,
  ArrowLeftRight,
  CalendarClock,
  Award,
  MapPin,
  FileSpreadsheet,
  Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBadge } from "@/components/notification-badge";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    organizationName?: string;
  };
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Schedule", href: "/dashboard/schedule", icon: Calendar },
  { name: "Timesheet", href: "/dashboard/timesheet", icon: Clock },
  { name: "Availability", href: "/dashboard/availability", icon: CalendarClock },
  { name: "Shift Swaps", href: "/dashboard/swaps", icon: ArrowLeftRight },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Holidays", href: "/dashboard/holidays", icon: Palmtree },
  { name: "Team", href: "/dashboard/team", icon: Users },
  { name: "Certifications", href: "/dashboard/certifications", icon: Award, managerOnly: true },
  { name: "Locations", href: "/dashboard/locations", icon: MapPin, managerOnly: true },
  { name: "Break Rules", href: "/dashboard/break-rules", icon: Coffee, adminOnly: true },
  { name: "Export", href: "/dashboard/export", icon: FileSpreadsheet, managerOnly: true },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
] as const;

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="p-2 bg-primary rounded-lg">
          <Clock className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-lg">ShiftFlow</h1>
          <p className="text-xs text-muted-foreground truncate max-w-[140px]">
            {user.organizationName}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation
          .filter((item) => {
            if ('adminOnly' in item && item.adminOnly) {
              return user.role === "ADMIN";
            }
            if ('managerOnly' in item && item.managerOnly) {
              return user.role === "ADMIN" || user.role === "MANAGER";
            }
            return true;
          })
          .map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <NotificationBadge />
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
