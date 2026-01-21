"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Users,
  Palmtree,
  Settings,
  LogOut,
  Home,
  ArrowLeftRight,
  CalendarClock,
  MapPin,
  FileSpreadsheet,
  Coffee,
  Layers,
  ShieldCheck,
  Wrench,
  BarChart3,
  TrendingUp,
  Wallet,
  Banknote,
  Smartphone,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBadge } from "@/components/notification-badge";
import { Tooltip } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/sidebar-context";

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
  { name: "Holidays", href: "/dashboard/holidays", icon: Palmtree },
  { name: "Team", href: "/dashboard/team", icon: Users },
  { name: "Compliance", href: "/dashboard/compliance", icon: ShieldCheck },
  { name: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
  { name: "Setting Sign-offs", href: "/dashboard/setting-signoffs", icon: ClipboardCheck, managerOnly: true },
  { name: "Growth", href: "/dashboard/growth", icon: TrendingUp, managerOnly: true },
  { name: "Spend", href: "/dashboard/spend", icon: Wallet, managerOnly: true },
  { name: "Cash", href: "/dashboard/cash", icon: Banknote },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, managerOnly: true },
  { name: "Locations", href: "/dashboard/locations", icon: MapPin, managerOnly: true },
  { name: "Shift Types", href: "/dashboard/shift-types", icon: Layers, adminOnly: true },
  { name: "Break Rules", href: "/dashboard/break-rules", icon: Coffee, adminOnly: true },
  { name: "Export", href: "/dashboard/export", icon: FileSpreadsheet, managerOnly: true },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
] as const;

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebar();

  const filteredNavigation = navigation.filter((item) => {
    if ('adminOnly' in item && item.adminOnly) {
      return user.role === "ADMIN";
    }
    if ('managerOnly' in item && item.managerOnly) {
      return user.role === "ADMIN" || user.role === "MANAGER";
    }
    return true;
  });

  return (
    <div
      className={cn(
        "flex h-screen flex-col bg-card border-r transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center border-b",
        collapsed ? "justify-center px-2" : "gap-2 px-6"
      )}>
        <div className="p-2 bg-primary rounded-lg flex-shrink-0">
          <Clock className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="font-bold text-lg">ShiftFlow</h1>
            <p className="text-xs text-muted-foreground truncate max-w-[140px]">
              {user.organizationName}
            </p>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className={cn("flex px-2 py-2", collapsed ? "justify-center" : "justify-end")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className="h-8 w-8"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-1 px-2 pb-4">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          const linkElement = (
            <Link
              href={item.href}
              className={cn(
                "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && item.name}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.name} content={item.name} side="right">
                {linkElement}
              </Tooltip>
            );
          }

          return (
            <div key={item.name}>
              {linkElement}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className={cn("border-t", collapsed ? "p-2" : "p-4")}>
        {collapsed ? (
          // Collapsed user section
          <div className="flex flex-col items-center gap-2">
            <Tooltip content={user.name || "User"} side="right">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            </Tooltip>
            <NotificationBadge />
            <Tooltip content="Sign out" side="right">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="h-9 w-9"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </Tooltip>
            <Tooltip content="Mobile View" side="right">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground"
                onClick={() => {
                  document.cookie = "prefer-mobile=true; path=/; max-age=86400";
                  window.location.href = "/staff";
                }}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        ) : (
          // Expanded user section
          <>
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
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 mt-2 text-muted-foreground"
              onClick={() => {
                document.cookie = "prefer-mobile=true; path=/; max-age=86400";
                window.location.href = "/staff";
              }}
            >
              <Smartphone className="h-4 w-4" />
              Mobile View
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
