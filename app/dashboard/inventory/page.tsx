import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InventoryManager } from "@/components/inventory-manager";

async function getInventoryData(organizationId: string) {
  const locations = await prisma.location.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { locations };
}

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user) return null;

  const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
  const isAdmin = session.user.role === "ADMIN";

  if (!isManager) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="text-muted-foreground mt-4">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  const { locations } = await getInventoryData(session.user.organizationId);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="text-muted-foreground mt-1">
          Track cleaning supplies and equipment stock levels
        </p>
      </div>

      <InventoryManager locations={locations} isAdmin={isAdmin} />
    </div>
  );
}
