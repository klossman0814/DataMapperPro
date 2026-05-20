import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@datamapperpro.com' } });
  if (existing) {
    console.log('Demo user already exists');
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@datamapperpro.com',
      passwordHash,
      name: 'Admin User',
    },
  });

  console.log('Demo user created: admin@datamapperpro.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
