"use client";

import { SidebarProvider } from "@/components/sidebar-context";
import { Sidebar } from "@/components/sidebar";

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

export function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
