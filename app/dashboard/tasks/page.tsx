import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { TaskManager } from "@/components/task-manager";

interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  staffRole?: string;
  organizationId: string;
}

export default async function TasksPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as ExtendedUser;
  const isManager = user.role === "MANAGER" || user.role === "ADMIN";

  // Fetch locations for filtering
  const locations = await prisma.location.findMany({
    where: {
      organizationId: user.organizationId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Weekly Tasks</h1>
        <p className="text-muted-foreground">
          {isManager
            ? "Manage recurring tasks and handover notes for your team"
            : "View and complete your assigned tasks"}
        </p>
      </div>

      <TaskManager isManager={isManager} locations={locations} />
    </div>
  );
}
