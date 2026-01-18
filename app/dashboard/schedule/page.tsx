import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { CreateShiftDialog } from "@/components/create-shift-dialog";

async function getScheduleData(organizationId: string, userId: string, role: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 2);

  const [shifts, users, organization] = await Promise.all([
    prisma.shift.findMany({
      where: {
        organizationId,
        startTime: { gte: startOfMonth, lt: endOfMonth },
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true, hourlyRate: true, color: true },
        },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { breakRules: true },
    }),
  ]);

  return { shifts, users, breakRules: organization?.breakRules || "" };
}

export default async function SchedulePage() {
  const session = await auth();
  if (!session?.user) return null;

  const { shifts, users, breakRules } = await getScheduleData(
    session.user.organizationId,
    session.user.id,
    session.user.role
  );

  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground mt-1">
            {isManager
              ? "Manage and assign shifts for your team"
              : "View your upcoming shifts"}
          </p>
        </div>
        {isManager && (
          <CreateShiftDialog users={users} breakRules={breakRules} />
        )}
      </div>

      <ScheduleCalendar
        shifts={shifts}
        users={users}
        currentUserId={session.user.id}
        isManager={isManager}
      />
    </div>
  );
}
