'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const carSchema = z.object({
  name: z.string().min(1, 'Nama mobil wajib diisi'),
  licensePlate: z.string().min(1, 'Plat nomor wajib diisi'),
  barcodeString: z.string().optional(),
});

export type CarInput = z.infer<typeof carSchema>;

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
          fuelPurchases: true,
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
    const car = await prisma.car.create({
      data: {
        name: validated.data.name,
        licensePlate: validated.data.licensePlate,
        barcodeString: validated.data.barcodeString || validated.data.licensePlate.replace(/\s/g, '-'),
      },
    });

    revalidatePath('/dashboard/cars');
    return { success: true, car };
  } catch (error) {
    console.error('Failed to create car:', error);
    return { error: 'Gagal menambah mobil' };
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
    const car = await prisma.car.update({
      where: { id },
      data: {
        name: validated.data.name,
        licensePlate: validated.data.licensePlate,
        barcodeString: validated.data.barcodeString,
      },
    });

    revalidatePath('/dashboard/cars');
    revalidatePath(`/dashboard/cars/${id}`);
    return { success: true, car };
  } catch (error) {
    console.error('Failed to update car:', error);
    return { error: 'Gagal mengupdate mobil' };
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
