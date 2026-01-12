'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { PengajuanStatus } from '@/generated/prisma/enums';
import { z } from 'zod';

const createPengajuanSchema = z.object({
  notes: z.string().optional(),
  items: z.array(z.object({
    requirement: z.string().min(1),
    estimation: z.coerce.number().int().positive(),
    carId: z.string().uuid(),
    imageUrl: z.string().url().optional().nullable(),
  })).min(1, 'Minimal satu item'),
});

export type CreatePengajuanInput = z.infer<typeof createPengajuanSchema>;

export async function getPengajuans(options?: { status?: PengajuanStatus }) {
  const { status } = options ?? {};

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const pengajuans = await prisma.pengajuan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          car: { select: { name: true, licensePlate: true } },
        },
      },
    },
  });

  return pengajuans;
}

export async function createPengajuan(data: CreatePengajuanInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const validated = createPengajuanSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  try {
    const pengajuan = await prisma.pengajuan.create({
      data: {
        notes: validated.data.notes ?? null,
        status: PengajuanStatus.PENDING,
        items: {
          create: validated.data.items.map((item) => ({
            requirement: item.requirement,
            estimation: item.estimation,
            carId: item.carId,
            imageUrl: item.imageUrl ?? null,
          })),
        },
      },
      include: { items: true },
    });

    revalidatePath('/dashboard/pengajuan');
    return { success: true, pengajuan };
  } catch (error) {
    console.error('Failed to create pengajuan:', error);
    return { error: 'Gagal membuat pengajuan' };
  }
}

export async function approvePengajuan(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    const pengajuan = await prisma.pengajuan.update({
      where: { id },
      data: {
        status: PengajuanStatus.APPROVED,
      },
    });

    revalidatePath('/dashboard/pengajuan');
    return { success: true, pengajuan };
  } catch (error) {
    console.error('Failed to approve pengajuan:', error);
    return { error: 'Gagal menyetujui pengajuan' };
  }
}

export async function rejectPengajuan(id: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    const pengajuan = await prisma.pengajuan.update({
      where: { id },
      data: {
        status: PengajuanStatus.REJECTED,
        notes: reason,
      },
    });

    revalidatePath('/dashboard/pengajuan');
    return { success: true, pengajuan };
  } catch (error) {
    console.error('Failed to reject pengajuan:', error);
    return { error: 'Gagal menolak pengajuan' };
  }
}
