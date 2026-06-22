'use server';

import { prisma } from '@/lib/prisma';
import { TransactionLedger, TransactionType } from '@/generated/prisma/enums';

export async function calculateBalanceBefore(date: Date, excludeTransactionId?: string) {
  const baseWhere = {
    date: { lt: date },
    deletedAt: null,
    ...(excludeTransactionId ? { id: { not: excludeTransactionId } } : {}),
  };

  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        ...baseWhere,
        ledger: TransactionLedger.FINANCE,
        type: TransactionType.INCOME,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        ...baseWhere,
        ledger: TransactionLedger.FINANCE,
        type: TransactionType.EXPENSE,
      },
      _sum: { amount: true },
    }),
  ]);

  return (income._sum.amount ?? 0) - (expense._sum.amount ?? 0);
}

export async function calculateCurrentFinanceBalance() {
  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        deletedAt: null,
        ledger: TransactionLedger.FINANCE,
        type: TransactionType.INCOME,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        deletedAt: null,
        ledger: TransactionLedger.FINANCE,
        type: TransactionType.EXPENSE,
      },
      _sum: { amount: true },
    }),
  ]);

  return (income._sum.amount ?? 0) - (expense._sum.amount ?? 0);
}

export async function calculateFuelBalanceBefore(date: Date, excludeTransactionId?: string) {
  const baseWhere = {
    date: { lt: date },
    deletedAt: null,
    ledger: TransactionLedger.FUEL,
    ...(excludeTransactionId ? { id: { not: excludeTransactionId } } : {}),
  };

  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        ...baseWhere,
        type: TransactionType.INCOME,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        ...baseWhere,
        type: TransactionType.FUEL_PURCHASE,
      },
      _sum: { amount: true },
    }),
  ]);

  return (income._sum.amount ?? 0) - (expense._sum.amount ?? 0);
}
