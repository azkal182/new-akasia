'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { PerizinanStatus } from '@/generated/prisma/enums';
import { z } from 'zod';

const createPerizinanSchema = z.object({
  carId: z.string().uuid('Invalid car ID'),
  name: z.string().min(1, 'Nama pemohon wajib diisi'),
  purpose: z.string().min(1, 'Tujuan wajib diisi'),
  destination: z.string().min(1, 'Tempat tujuan wajib diisi'),
  description: z.string().optional(),
  numberOfPassengers: z.coerce.number().int().positive(),
  date: z.coerce.date(),
  estimation: z.coerce.number().int().positive('Estimasi biaya wajib diisi'),
});

export type CreatePerizinanInput = z.infer<typeof createPerizinanSchema>;

export async function getPerizinans(options?: {
  status?: PerizinanStatus;
  carId?: string;
}) {
  const { status, carId } = options ?? {};

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (carId) where.carId = carId;

  const perizinans = await prisma.perizinan.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      car: { select: { id: true, name: true, licensePlate: true } },
    },
  });

  return perizinans;
}

export async function getPendingPerizinans() {
  const perizinans = await prisma.perizinan.findMany({
    where: {
      status: PerizinanStatus.PENDING,
    },
    orderBy: { date: 'asc' },
    include: {
      car: { select: { name: true, licensePlate: true } },
    },
  });

  return perizinans;
}

export async function createPerizinan(data: CreatePerizinanInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const validated = createPerizinanSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  try {
    const perizinan = await prisma.perizinan.create({
      data: {
        carId: validated.data.carId,
        name: validated.data.name,
        purpose: validated.data.purpose,
        destination: validated.data.destination,
        description: validated.data.description ?? null,
        numberOfPassengers: validated.data.numberOfPassengers,
        date: validated.data.date,
        estimation: validated.data.estimation,
        status: PerizinanStatus.PENDING,
      },
    });

    revalidatePath('/dashboard/perizinan');
    return { success: true, perizinan };
  } catch (error) {
    console.error('Failed to create perizinan:', error);
    return { error: 'Gagal menambah perizinan' };
  }
}

export async function approvePerizinan(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    const perizinan = await prisma.perizinan.update({
      where: { id },
      data: {
        status: PerizinanStatus.APPROVED,
      },
    });

    revalidatePath('/dashboard/perizinan');
    return { success: true, perizinan };
  } catch (error) {
    console.error('Failed to approve perizinan:', error);
    return { error: 'Gagal menyetujui perizinan' };
  }
}

export async function rejectPerizinan(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    const perizinan = await prisma.perizinan.update({
      where: { id },
      data: {
        status: PerizinanStatus.REJECTED,
      },
    });

    revalidatePath('/dashboard/perizinan');
    return { success: true, perizinan };
  } catch (error) {
    console.error('Failed to reject perizinan:', error);
    return { error: 'Gagal menolak perizinan' };
  }
}
