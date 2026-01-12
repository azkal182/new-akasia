'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { TransactionType } from '@/generated/prisma/enums';
import { z } from 'zod';
import moment from 'moment-hijri';

const purchaseFuelSchema = z.object({
  carId: z.string().uuid('Invalid car ID'),
  literAmount: z.coerce.number().positive('Liter amount must be positive'),
  pricePerLiter: z.coerce.number().positive('Price per liter must be positive'),
  date: z.coerce.date(),
  notes: z.string().optional(),
});

const receiveIncomeSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  source: z.string().min(1, 'Source is required'),
  date: z.coerce.date(),
  notes: z.string().optional(),
});

export type PurchaseFuelInput = z.infer<typeof purchaseFuelSchema>;
export type ReceiveIncomeInput = z.infer<typeof receiveIncomeSchema>;

export async function purchaseFuel(data: PurchaseFuelInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const validated = purchaseFuelSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { carId, literAmount, pricePerLiter, date, notes } = validated.data;
  const totalAmount = literAmount * pricePerLiter;

  try {
    // Get last transaction for balance
    const lastTransaction = await prisma.transaction.findFirst({
      orderBy: { date: 'desc' },
    });

    const balanceBefore = lastTransaction?.balanceAfter ?? 0;
    const balanceAfter = balanceBefore - totalAmount;

    // Get car info
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) {
      return { error: 'Mobil tidak ditemukan' };
    }

    // Create transaction with fuel purchase
    const transaction = await prisma.transaction.create({
      data: {
        type: TransactionType.FUEL_PURCHASE,
        amount: totalAmount,
        description: `Pembelian BBM - ${car.name} (${car.licensePlate})`,
        date: new Date(date),
        balanceBefore,
        balanceAfter,
        userId: session.user.id,
        fuelPurchase: {
          create: {
            carId,
            literAmount,
            pricePerLiter,
            totalAmount,
            notes: notes ?? null,
          },
        },
      },
      include: {
        fuelPurchase: true,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/fuel');

    return { success: true, transaction };
  } catch (error) {
    console.error('Failed to purchase fuel:', error);
    return { error: 'Gagal menyimpan pembelian BBM' };
  }
}

export async function receiveFuelIncome(data: ReceiveIncomeInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const validated = receiveIncomeSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { amount, source, date, notes } = validated.data;

  try {
    // Get last transaction for balance
    const lastTransaction = await prisma.transaction.findFirst({
      orderBy: { date: 'desc' },
    });

    const balanceBefore = lastTransaction?.balanceAfter ?? 0;
    const balanceAfter = balanceBefore + amount;

    const transaction = await prisma.transaction.create({
      data: {
        type: TransactionType.INCOME,
        amount,
        description: `Dana BBM - ${source}`,
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
    revalidatePath('/dashboard/fuel');

    return { success: true, transaction };
  } catch (error) {
    console.error('Failed to receive income:', error);
    return { error: 'Gagal menyimpan pemasukan' };
  }
}

export async function getFuelTransactions(options?: {
  year?: number;
  month?: number;
  hijriYear?: number;
  hijriMonth?: number;
}) {
  const { year, month, hijriYear, hijriMonth } = options ?? {};

  let startDate: Date;
  let endDate: Date;

  if (hijriYear && hijriMonth) {
    // Convert Hijri to Gregorian for date range
    const hijriStart = moment(`${hijriYear}/${hijriMonth}/1`, 'iYYYY/iM/iD');
    const hijriEnd = moment(`${hijriYear}/${hijriMonth}/1`, 'iYYYY/iM/iD').endOf('iMonth');
    startDate = hijriStart.toDate();
    endDate = hijriEnd.toDate();
  } else if (year && month) {
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59);
  } else {
    // Default to current month
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      type: { in: [TransactionType.INCOME, TransactionType.FUEL_PURCHASE] },
      date: {
        gte: startDate,
        lte: endDate,
      },
      deletedAt: null,
    },
    orderBy: { date: 'desc' },
    include: {
      income: true,
      fuelPurchase: {
        include: {
          car: true,
        },
      },
      user: {
        select: { name: true },
      },
    },
  });

  return transactions;
}

export async function getFuelMonthlyReport(hijriYear: number, hijriMonth: number) {
  // Convert Hijri to Gregorian for date range
  let startDate: Date;
  let endDate: Date;
  let hijriMonthName: string;
  let hijriYearStr: string;

  try {
    // Build start and end of the requested Hijri month
    const startStr = `${hijriYear}/${hijriMonth}/1`;
    const startMoment = moment(startStr, 'iYYYY/iM/iD');

    // For end date, go to first of next month and subtract 1 day
    let nextMonth = hijriMonth + 1;
    let nextYear = hijriYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    const endStr = `${nextYear}/${nextMonth}/1`;
    const endMoment = moment(endStr, 'iYYYY/iM/iD').subtract(1, 'day').endOf('day');

    startDate = startMoment.toDate();
    endDate = endMoment.toDate();
    hijriMonthName = startMoment.format('iMMMM');
    hijriYearStr = String(hijriYear);

    // Validate dates are reasonable
    if (startDate.getFullYear() < 1900 || startDate.getFullYear() > 2200 ||
        endDate.getFullYear() < 1900 || endDate.getFullYear() > 2200 ||
        isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date range from Hijri conversion');
    }
  } catch (err) {
    // Fallback to current Gregorian month if Hijri conversion fails
    console.warn('Hijri conversion failed:', err, 'Using Gregorian month fallback');
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    hijriMonthName = moment().format('iMMMM');
    hijriYearStr = moment().format('iYYYY');
  }

  const [incomeTotal, expenseTotal] = await Promise.all([
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
        type: TransactionType.FUEL_PURCHASE,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
  ]);

  // Get fuel usage per car
  const fuelBycar = await prisma.fuelPurchase.groupBy({
    by: ['carId'],
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: {
      literAmount: true,
      totalAmount: true,
    },
  });

  // Get car names
  const cars = await prisma.car.findMany({
    where: {
      id: { in: fuelBycar.map((f) => f.carId) },
    },
    select: { id: true, name: true, licensePlate: true },
  });

  const fuelByCarWithNames = fuelBycar.map((f) => {
    const car = cars.find((c) => c.id === f.carId);
    return {
      ...f,
      carName: car?.name ?? 'Unknown',
      carPlate: car?.licensePlate ?? '',
    };
  });

  return {
    hijriMonth: hijriMonthName,
    hijriYear: hijriYearStr,
    gregorianStart: startDate.toISOString(),
    gregorianEnd: endDate.toISOString(),
    totalIncome: incomeTotal._sum.amount ?? 0,
    totalExpense: expenseTotal._sum.amount ?? 0,
    balance: (incomeTotal._sum.amount ?? 0) - (expenseTotal._sum.amount ?? 0),
    fuelBycar: fuelByCarWithNames,
  };
}

export async function getCurrentHijriDate() {
  const now = moment();
  return {
    hijriYear: parseInt(now.format('iYYYY')),
    hijriMonth: parseInt(now.format('iM')),
    hijriMonthName: now.format('iMMMM'),
    hijriDate: now.format('iD iMMMM iYYYY'),
  };
}
