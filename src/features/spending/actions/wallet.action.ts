'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { WalletEntryType, WalletEntrySource } from '@/generated/prisma/enums';
import { createWalletEntrySchema, type CreateWalletEntryInput } from '../schemas';
import { getOrCreateWallet } from '../utils';

export async function getWalletOverview(limit = 25) {
  const wallet = await getOrCreateWallet();

  const [creditSum, debitSum, entries] = await Promise.all([
    prisma.walletEntry.aggregate({
      where: { walletId: wallet.id, type: WalletEntryType.CREDIT },
      _sum: { amount: true },
    }),
    prisma.walletEntry.aggregate({
      where: { walletId: wallet.id, type: WalletEntryType.DEBIT },
      _sum: { amount: true },
    }),
    prisma.walletEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      include: {
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  const balance = (creditSum._sum.amount ?? 0) - (debitSum._sum.amount ?? 0);

  return { wallet, balance, entries };
}

export async function createWalletEntry(data: CreateWalletEntryInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Tidak memiliki akses' };
  }

  const validated = createWalletEntrySchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const wallet = await getOrCreateWallet();

  const entry = await prisma.walletEntry.create({
    data: {
      walletId: wallet.id,
      type: validated.data.type,
      source: WalletEntrySource.MANUAL,
      amount: validated.data.amount,
      description: validated.data.description ?? null,
      occurredAt: validated.data.occurredAt ?? new Date(),
      attachmentUrl: validated.data.attachmentUrl ?? null,
      createdById: session.user.id,
    },
  });

  revalidatePath('/spending/wallet');
  return { success: true, entry };
}
