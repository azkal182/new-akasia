'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { TransactionType } from '@/generated/prisma/enums';
import { createIncomeSchema, type CreateIncomeInput } from '../schemas/transaction.schema';
import { auth } from '@/lib/auth';

export async function createIncome(data: CreateIncomeInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const validated = createIncomeSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { amount, source, date, notes } = validated.data;

  try {
    // Get recent transaction for balance calculation
    const lastTransaction = await prisma.transaction.findFirst({
      orderBy: { date: 'desc' },
    });

    const balanceBefore = lastTransaction?.balanceAfter ?? 0;
    const balanceAfter = balanceBefore + amount;

    // Create transaction with income relation
    const transaction = await prisma.transaction.create({
      data: {
        type: TransactionType.INCOME,
        amount,
        description: source,
        date: new Date(date),
        balanceBefore,
        balanceAfter,
        userId: session.user.id,
        income: {
          create: {
            source,
            notes: notes ?? null,
          },
        },
      },
      include: {
        income: true,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/finance');

    return { success: true, transaction };
  } catch (error) {
    console.error('Failed to create income:', error);
    return { error: 'Gagal menyimpan pemasukan' };
  }
}

export async function getTransactions(options?: {
  year?: number;
  month?: number;
  type?: TransactionType;
  limit?: number;
}) {
  const { year, month, type, limit = 50 } = options ?? {};

  const where: Record<string, unknown> = {
    deletedAt: null,
    // By default, only show INCOME and EXPENSE (not FUEL_PURCHASE)
    type: type ?? { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
  };

  if (year && month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    where.date = {
      gte: startDate,
      lte: endDate,
    };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
    take: limit,
    include: {
      income: true,
      expense: {
        include: {
          items: {
            include:{
                car:true
            }
          }
        },
      },
      fuelPurchase: {
        include: {
          car: true,
        },
      },
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
  });

  return transactions;
}

export async function getBalance() {
  // Calculate balance from sum of amounts (not from stored balanceAfter)
  // Only count INCOME and EXPENSE, not FUEL_PURCHASE
  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.INCOME,
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.EXPENSE,
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
  ]);

  return (income._sum.amount ?? 0) - (expense._sum.amount ?? 0);
}

export async function getMonthlyStats(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.INCOME,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.EXPENSE, // Only EXPENSE, not FUEL_PURCHASE
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalIncome: income._sum.amount ?? 0,
    totalExpense: expense._sum.amount ?? 0,
    net: (income._sum.amount ?? 0) - (expense._sum.amount ?? 0),
  };
}

// Helper function to convert Hijri date range to Gregorian with validation
async function getHijriMonthRange(hijriYear: number, hijriMonth: number) {
  const moment = (await import('moment-hijri')).default;

  try {
    // Build start and end of the requested Hijri month
    // Format: iYYYY/iM/iD - padded for proper parsing
    const startStr = `${hijriYear}/${hijriMonth}/1`;
    const startHijri = moment(startStr, 'iYYYY/iM/iD');

    // For end date, go to first of next month and subtract 1 day
    let nextMonth = hijriMonth + 1;
    let nextYear = hijriYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    const endStr = `${nextYear}/${nextMonth}/1`;
    const endHijri = moment(endStr, 'iYYYY/iM/iD').subtract(1, 'day').endOf('day');

    const startDate = startHijri.toDate();
    const endDate = endHijri.toDate();

    // Validate dates are reasonable (between year 1900 and 2200)
    if (startDate.getFullYear() < 1900 || startDate.getFullYear() > 2200 ||
        endDate.getFullYear() < 1900 || endDate.getFullYear() > 2200 ||
        isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date range from Hijri conversion');
    }

    return { startDate, endDate };
  } catch (err) {
    // Fallback to current Gregorian month
    console.warn('Hijri conversion failed:', err, 'Using Gregorian month fallback');
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
}

export async function getTransactionsByHijriMonth(hijriYear: number, hijriMonth: number) {
  const { startDate, endDate } = await getHijriMonthRange(hijriYear, hijriMonth);

  // DEBUG: Log date range
  console.log('=== DEBUG: getTransactionsByHijriMonth ===');
  console.log('Input:', { hijriYear, hijriMonth });
  console.log('Date Range:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });

  // Calculate opening balance from all transactions BEFORE this month
  // This is the sum of all income minus expenses before startDate
  // Note: FUEL_PURCHASE is NOT included - it's a separate ledger
  const [incomeBefore, expenseBefore] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        date: { lt: startDate },
        type: TransactionType.INCOME,
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        date: { lt: startDate },
        type: TransactionType.EXPENSE, // Only EXPENSE, not FUEL_PURCHASE
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
  ]);

  // DEBUG: Log aggregate results
  console.log('Income Before startDate:', incomeBefore._sum.amount ?? 0);
  console.log('Expense Before startDate (excluding BBM):', expenseBefore._sum.amount ?? 0);

  const previousMonthBalance = (incomeBefore._sum.amount ?? 0) - (expenseBefore._sum.amount ?? 0);

  // DEBUG: Log calculated balance
  console.log('Saldo Bulan Lalu (calculated):', previousMonthBalance);
  console.log('=========================================');

  // Get transactions for the Hijri month (INCOME and EXPENSE only, not FUEL_PURCHASE)
  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
      deletedAt: null,
    },
    orderBy: { date: 'asc' },
    include: {
      income: true,
      expense: {
        include: {
          items: true,
        },
      },
      fuelPurchase: {
        include: {
          car: true,
        },
      },
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
  });

  // Calculate stats for this month
  const totalIncome = transactions
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((sum: number, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((sum: number, t) => sum + t.amount, 0);

  // Opening balance is the sum of all previous transactions
  const openingBalance = previousMonthBalance;

  // Closing balance is opening + income - expense
  const closingBalance = openingBalance + totalIncome - totalExpense;

  return {
    transactions,
    stats: {
      totalIncome,
      totalExpense,
      openingBalance,
      closingBalance,
      previousMonthBalance, // Same as opening, but explicit for clarity
    },
  };
}
