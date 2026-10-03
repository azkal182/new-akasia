'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { TransactionLedger, TransactionType } from '@/generated/prisma/enums';
import { FUEL_START_DATE } from '@/features/fuel/constants';

const carSchema = z.object({
  name: z.string().min(1, 'Nama mobil wajib diisi'),
  licensePlate: z.string().min(1, 'Plat nomor wajib diisi'),
  chassisNumber: z.string().optional(),
  bpkbOwnerName: z.string().optional(),
  barcodeString: z.string().optional(),
});

export type CarInput = z.infer<typeof carSchema>;

function normalizeOptionalUniqueString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function getCarUniqueErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

    if (target.includes('barcodeString')) {
      return 'Kode barcode sudah digunakan';
    }

    if (target.includes('licensePlate')) {
      return 'Plat nomor sudah digunakan';
    }

    if (target.includes('chassisNumber')) {
      return 'Nomor rangka sudah digunakan';
    }

    return 'Data kendaraan sudah digunakan';
  }

  return null;
}

export async function getCars() {
  const cars = await prisma.car.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    include: {
      usageRecords: {
        take: 1,
        orderBy: { startTime: 'desc' },
        include: {
          user: {
            select: { name: true },
          },
        },
      },
      _count: {
        select: {
          usageRecords: true,
          fuelPurchases: {
            where: {
              transaction: {
                type: TransactionType.FUEL_PURCHASE,
                ledger: TransactionLedger.FUEL,
                date: { gte: FUEL_START_DATE },
                deletedAt: null,
              },
            },
          },
          taxes: true,
        },
      },
    },
  });

  return cars;
}

export async function getCarById(id: string) {
  const car = await prisma.car.findUnique({
    where: { id },
    include: {
      usageRecords: {
        orderBy: { startTime: 'desc' },
        take: 10,
        include: {
          user: {
            select: { name: true, username: true },
          },
        },
      },
      fuelPurchases: {
        where: {
          transaction: {
            type: TransactionType.FUEL_PURCHASE,
            ledger: TransactionLedger.FUEL,
            date: { gte: FUEL_START_DATE },
            deletedAt: null,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      taxes: {
        orderBy: { dueDate: 'desc' },
        take: 5,
      },
    },
  });

  return car;
}

export async function createCar(data: CarInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const validated = carSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  try {
    const barcodeString = normalizeOptionalUniqueString(validated.data.barcodeString);
    const chassisNumber = normalizeOptionalUniqueString(validated.data.chassisNumber);
    const bpkbOwnerName = normalizeOptionalUniqueString(validated.data.bpkbOwnerName);

    const car = await prisma.car.create({
      data: {
        name: validated.data.name.trim(),
        licensePlate: validated.data.licensePlate.trim(),
        chassisNumber,
        bpkbOwnerName,
        barcodeString,
      },
    });

    revalidatePath('/dashboard/cars');
    return { success: true, car };
  } catch (error) {
    console.error('Failed to create car:', error);
    return { error: getCarUniqueErrorMessage(error) ?? 'Gagal menambah mobil' };
  }
}

export async function updateCar(id: string, data: CarInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const validated = carSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  try {
    const barcodeString = normalizeOptionalUniqueString(validated.data.barcodeString);
    const chassisNumber = normalizeOptionalUniqueString(validated.data.chassisNumber);
    const bpkbOwnerName = normalizeOptionalUniqueString(validated.data.bpkbOwnerName);

    const car = await prisma.car.update({
      where: { id },
      data: {
        name: validated.data.name.trim(),
        licensePlate: validated.data.licensePlate.trim(),
        chassisNumber,
        bpkbOwnerName,
        barcodeString,
      },
    });

    revalidatePath('/dashboard/cars');
    revalidatePath(`/dashboard/cars/${id}`);
    return { success: true, car };
  } catch (error) {
    console.error('Failed to update car:', error);
    return { error: getCarUniqueErrorMessage(error) ?? 'Gagal mengupdate mobil' };
  }
}

export async function deleteCar(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    await prisma.car.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath('/dashboard/cars');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete car:', error);
    return { error: 'Gagal menghapus mobil' };
  }
}
