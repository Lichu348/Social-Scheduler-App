import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Checking database...\n");

  const orgs = await prisma.organization.findMany();
  console.log("=== Organizations ===");
  console.log(orgs.length ? orgs : "No organizations found!");

  console.log("\n=== Users ===");
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, organizationId: true }
  });
  console.log(users.length ? users : "No users found!");

  console.log("\n=== Locations ===");
  const locations = await prisma.location.findMany();
  console.log(locations.length ? locations.map(l => ({ id: l.id, name: l.name, orgId: l.organizationId })) : "No locations found!");

  console.log("\n=== Shift Templates ===");
  const templates = await prisma.shiftTemplate.findMany();
  console.log(templates.length ? templates : "No templates found!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
