import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Customer Service', color: '#3b82f6', hourlyRate: 11.44 }, // Blue
  { name: 'Coaching', color: '#10b981', hourlyRate: 15.00 },          // Green
  { name: 'Setter', color: '#f59e0b', hourlyRate: 14.00 },            // Amber
  { name: 'Duty Manager', color: '#8b5cf6', hourlyRate: 13.00 },      // Purple
];

async function main() {
  // Get the organization
  const org = await prisma.organization.findFirst();

  if (!org) {
    console.error('No organization found!');
    return;
  }

  console.log(`Seeding categories for organization: ${org.name} (${org.id})\n`);

  for (const cat of categories) {
    // Check if category already exists
    const existing = await prisma.shiftCategory.findFirst({
      where: {
        organizationId: org.id,
        name: cat.name
      }
    });

    if (existing) {
      console.log(`✓ "${cat.name}" already exists (${existing.color})`);
    } else {
      const created = await prisma.shiftCategory.create({
        data: {
          name: cat.name,
          color: cat.color,
          hourlyRate: cat.hourlyRate,
          organizationId: org.id,
        }
      });
      console.log(`+ Created "${cat.name}" with color ${cat.color}`);
    }
  }

  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
