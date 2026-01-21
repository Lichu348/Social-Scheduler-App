import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { GrowthDashboard } from "@/components/growth-dashboard";

async function getLocations(organizationId: string) {
  return prisma.location.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function getUsers(organizationId: string) {
  return prisma.user.findMany({
    where: { organizationId },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export default async function GrowthPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Only managers and admins can access growth tracking
  if (session.user.role === "EMPLOYEE") {
    redirect("/dashboard");
  }

  const [locations, users] = await Promise.all([
    getLocations(session.user.organizationId),
    getUsers(session.user.organizationId),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Centre Growth</h1>
        <p className="text-muted-foreground mt-1">
          Track activities that drive membership, kids club, and group bookings growth
        </p>
      </div>

      <GrowthDashboard
        locations={locations}
        users={users}
        currentUserId={session.user.id}
        isAdmin={session.user.role === "ADMIN"}
      />
    </div>
  );
}
