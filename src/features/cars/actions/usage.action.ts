'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { CarStatus } from '@/generated/prisma/enums';
import { z } from 'zod';

const createUsageRecordSchema = z.object({
  carId: z.string().uuid('Pilih kendaraan'),
  purpose: z.string().min(1, 'Tujuan penggunaan wajib diisi'),
  destination: z.string().min(1, 'Tempat tujuan wajib diisi'),
  startTime: z.coerce.date(),
});

const endUsageRecordSchema = z.object({
  recordId: z.string().uuid(),
  endTime: z.coerce.date(),
});

export type CreateUsageRecordInput = z.infer<typeof createUsageRecordSchema>;
export type EndUsageRecordInput = z.infer<typeof endUsageRecordSchema>;

export async function getUsageRecords(options?: {
  carId?: string;
  userId?: string;
  active?: boolean;
  limit?: number;
}) {
  const { carId, userId, active, limit } = options ?? {};

  const where: Record<string, unknown> = {};
  if (carId) where.carId = carId;
  if (userId) where.userId = userId;
  if (active !== undefined) {
    if (active) {
      where.endTime = null;
    } else {
      where.endTime = { not: null };
    }
  }

  const records = await prisma.usageRecord.findMany({
    where,
    orderBy: { startTime: 'desc' },
    take: limit,
    include: {
      car: { select: { id: true, name: true, licensePlate: true, status: true } },
      user: { select: { id: true, name: true, username: true } },
    },
  });

  return records;
}

export async function getActiveUsageRecords() {
  const records = await prisma.usageRecord.findMany({
    where: { endTime: null },
    orderBy: { startTime: 'desc' },
    include: {
      car: { select: { id: true, name: true, licensePlate: true } },
      user: { select: { name: true, username: true } },
    },
  });

  return records;
}

// Get current user's active driving status
export async function getCurrentUserDrivingStatus() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const activeRecord = await prisma.usageRecord.findFirst({
    where: {
      userId: session.user.id,
      endTime: null,
    },
    include: {
      car: { select: { id: true, name: true, licensePlate: true } },
    },
  });

  return activeRecord;
}

export async function startCarUsage(data: CreateUsageRecordInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const validated = createUsageRecordSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  // Check if user is already driving another car
  const existingUsage = await prisma.usageRecord.findFirst({
    where: {
      userId: session.user.id,
      endTime: null,
    },
    include: { car: { select: { name: true } } },
  });

  if (existingUsage) {
    return { error: `Anda masih mengendarai ${existingUsage.car.name}. Selesaikan dulu sebelum menggunakan kendaraan lain.` };
  }

  // Check if car is available
  const car = await prisma.car.findUnique({
    where: { id: validated.data.carId },
    select: { status: true, name: true },
  });

  if (!car) {
    return { error: 'Kendaraan tidak ditemukan' };
  }

  if (car.status !== CarStatus.AVAILABLE) {
    return { error: `Kendaraan ${car.name} sedang tidak tersedia` };
  }

  try {
    // Create usage record and update car status
    const [record] = await prisma.$transaction([
      prisma.usageRecord.create({
        data: {
          carId: validated.data.carId,
          userId: session.user.id,
          purpose: validated.data.purpose,
          destination: validated.data.destination,
          startTime: validated.data.startTime,
        },
      }),
      prisma.car.update({
        where: { id: validated.data.carId },
        data: { status: CarStatus.IN_USE },
      }),
    ]);

    revalidatePath('/dashboard/cars');
    revalidatePath('/dashboard');
    return { success: true, record };
  } catch (error) {
    console.error('Failed to start car usage:', error);
    return { error: 'Gagal memulai penggunaan kendaraan' };
  }
}

export async function endCarUsage(data: EndUsageRecordInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const validated = endUsageRecordSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  // Get the record
  const record = await prisma.usageRecord.findUnique({
    where: { id: validated.data.recordId },
    select: { carId: true, endTime: true },
  });

  if (!record) {
    return { error: 'Record tidak ditemukan' };
  }

  if (record.endTime) {
    return { error: 'Penggunaan sudah selesai' };
  }

  try {
    // End usage and update car status to available
    await prisma.$transaction([
      prisma.usageRecord.update({
        where: { id: validated.data.recordId },
        data: {
          endTime: validated.data.endTime,
        },
      }),
      prisma.car.update({
        where: { id: record.carId },
        data: { status: CarStatus.AVAILABLE },
      }),
    ]);

    revalidatePath('/dashboard/cars');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to end car usage:', error);
    return { error: 'Gagal mengakhiri penggunaan kendaraan' };
  }
}
