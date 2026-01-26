"use client";

import { SidebarProvider, useSidebar } from "@/components/sidebar-context";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { PushNotificationManager } from "@/components/push-notification-manager";

interface DashboardLayoutClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    organizationName?: string;
    organizationId: string;
  };
  children: React.ReactNode;
}

function MobileHeader() {
  const { toggleMobile } = useSidebar();

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 md:hidden">
      <Button variant="ghost" size="icon" onClick={toggleMobile}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      <span className="font-semibold">ShiftFlow</span>
      <div className="ml-auto">
        <PushNotificationManager />
      </div>
    </div>
  );
}

function DashboardContent({ user, children }: DashboardLayoutClientProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader />
        <div className="hidden md:flex h-14 items-center justify-end border-b bg-card px-4">
          <PushNotificationManager />
        </div>
        <main className="flex-1 overflow-y-auto bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  return (
    <SidebarProvider>
      <DashboardContent user={user}>{children}</DashboardContent>
    </SidebarProvider>
  );
}
