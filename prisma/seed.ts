/**
 * Prisma 7 Seed Script
 *
 * This script uses a simpler approach that works with both local and remote databases.
 * Run with: npx prisma db seed
 */

import 'dotenv/config';
import { hash } from 'bcryptjs';

// Import Prisma client dynamically to use config from prisma.config.ts
async function main() {
  console.log('Seeding database...');

  // Use the same client setup as the app
  const { Pool } = await import('pg');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const { PrismaClient, UserRole } = await import('../src/generated/prisma/client');

  const connectionString = process.env.DATABASE_URL!;
  console.log('Connecting with URL ending in:', connectionString.split('@').pop()?.substring(0, 30) + '...');

  // Parse URL to check if it needs SSL
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get('sslmode');

  const pool = new Pool({
    connectionString,
    ssl: sslMode === 'require' ? { rejectUnauthorized: false } : false,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Create admin user
    const hashedPassword = await hash('admin123', 10);

    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        name: 'Administrator',
        username: 'admin',
        password: hashedPassword,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
    console.log('✓ Created admin user:', admin.username);

    // Create sample user
    const userPassword = await hash('user123', 10);

    const user = await prisma.user.upsert({
      where: { username: 'operator' },
      update: {},
      create: {
        name: 'Operator',
        username: 'operator',
        password: userPassword,
        role: UserRole.USER,
        isActive: true,
      },
    });
    console.log('✓ Created operator user:', user.username);

    // Create sample cars
    const car1 = await prisma.car.upsert({
      where: { licensePlate: 'B 1234 XYZ' },
      update: {},
      create: {
        name: 'Toyota Innova',
        licensePlate: 'B 1234 XYZ',
        barcodeString: 'CAR-001',
      },
    });
    console.log('✓ Created car:', car1.name);

    const car2 = await prisma.car.upsert({
      where: { licensePlate: 'B 5678 ABC' },
      update: {},
      create: {
        name: 'Mitsubishi Pajero',
        licensePlate: 'B 5678 ABC',
        barcodeString: 'CAR-002',
      },
    });
    console.log('✓ Created car:', car2.name);

    const car3 = await prisma.car.upsert({
      where: { licensePlate: 'B 9012 DEF' },
      update: {},
      create: {
        name: 'Toyota Avanza',
        licensePlate: 'B 9012 DEF',
        barcodeString: 'CAR-003',
      },
    });
    console.log('✓ Created car:', car3.name);

    const wallet = await prisma.wallet.upsert({
      where: { name: 'Global Wallet' },
      update: {},
      create: { name: 'Global Wallet' },
    });
    console.log('✓ Ensured wallet:', wallet.name);

    console.log('\n🎉 Seeding completed successfully!');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Seeding failed:', e.message);
  process.exit(1);
});
