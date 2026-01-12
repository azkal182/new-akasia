'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { WalletEntrySource, WalletEntryType } from '@/generated/prisma/enums';
import { createCashbackSchema, type CreateCashbackInput } from '../schemas';
import { getOrCreateWallet, getTaskSummary } from '../utils';

export async function createCashback(receiptId: string, data: CreateCashbackInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const validated = createCashbackSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    select: {
      id: true,
      vendor: true,
      taskId: true,
    },
  });

  if (!receipt) {
    return { error: 'Nota tidak ditemukan' };
  }

  const summary = await getTaskSummary(receipt.taskId);
  if (!summary) {
    return { error: 'Anggaran tidak ditemukan' };
  }

  if (summary.isLocked) {
    return { error: 'TASK_LOCKED' };
  }

  const wallet = await getOrCreateWallet();

  const result = await prisma.$transaction(async (tx) => {
    const cashback = await tx.cashback.create({
      data: {
        receiptId,
        amount: validated.data.amount,
        vendor: validated.data.vendor ?? receipt.vendor ?? null,
        notes: validated.data.notes ?? null,
        occurredAt: validated.data.occurredAt ?? new Date(),
        createdById: session.user.id,
      },
    });

    const walletEntry = await tx.walletEntry.create({
      data: {
        walletId: wallet.id,
        type: WalletEntryType.CREDIT,
        source: WalletEntrySource.CASHBACK,
        amount: validated.data.amount,
        description: validated.data.vendor ?? receipt.vendor ?? validated.data.notes ?? null,
        occurredAt: validated.data.occurredAt ?? new Date(),
        taskId: receipt.taskId,
        cashbackId: cashback.id,
        createdById: session.user.id,
      },
    });

    return { cashback, walletEntry };
  });

  revalidatePath('/spending');
  revalidatePath(`/spending/${receipt.taskId}`);
  revalidatePath('/spending/wallet');

  return { success: true, ...result };
}
