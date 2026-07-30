"use server";

import { revalidatePath } from "next/cache";
import moment from "moment-hijri";
import { prisma } from "@/lib/prisma";
import { TransactionLedger, TransactionType } from "@/generated/prisma/enums";
import {
  createIncomeSchema,
  updateIncomeSchema,
  type CreateIncomeInput,
  type UpdateIncomeInput,
} from "../schemas/transaction.schema";
import { auth } from "@/lib/auth";
import {
  calculateBalanceBefore,
  calculateCurrentFinanceBalance,
} from "./balance.util";
import { financeTransactionWhere } from "./transaction-filters";

export async function createIncome(data: CreateIncomeInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const validated = createIncomeSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { amount, source, date, notes } = validated.data;
  const entryDate = new Date(date);

  try {
    const balanceBefore = await calculateBalanceBefore(entryDate);
    const balanceAfter = balanceBefore + amount;

    // Create transaction with income relation
    const transaction = await prisma.transaction.create({
      data: {
        type: TransactionType.INCOME,
        ledger: TransactionLedger.FINANCE,
        amount,
        description: source,
        date: entryDate,
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

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/finance");

    return { success: true, transaction };
  } catch (error) {
    console.error("Failed to create income:", error);
    return { error: "Gagal menyimpan pemasukan" };
  }
}

export async function updateIncome(
  transactionId: string,
  data: UpdateIncomeInput,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const validated = updateIncomeSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { id: true, ledger: true, type: true, income: { select: { id: true } } },
  });

  if (
    !existing ||
    existing.ledger !== TransactionLedger.FINANCE ||
    existing.type !== TransactionType.INCOME ||
    !existing.income
  ) {
    return { error: "Transaksi pemasukan tidak ditemukan" };
  }

  const { amount, source, date, notes } = validated.data;
  const entryDate = new Date(date);
  const balanceBefore = await calculateBalanceBefore(entryDate, transactionId);
  const balanceAfter = balanceBefore + amount;

  try {
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        amount,
        description: source,
        date: entryDate,
        balanceBefore,
        balanceAfter,
        income: {
          update: {
            source,
            notes: notes ?? null,
          },
        },
      },
      include: {
        income: true,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/finance");

    return { success: true, transaction };
  } catch (error) {
    console.error("Failed to update income:", error);
    return { error: "Gagal memperbarui pemasukan" };
  }
}

export async function deleteIncome(transactionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { id: true, ledger: true, type: true },
  });

  if (!existing || existing.ledger !== TransactionLedger.FINANCE || existing.type !== TransactionType.INCOME) {
    return { error: "Transaksi pemasukan tidak ditemukan" };
  }

  try {
    await prisma.transaction.delete({
      where: { id: transactionId },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/finance");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete income:", error);
    return { error: "Gagal menghapus pemasukan" };
  }
}

export async function getTransactions(options?: {
  year?: number;
  month?: number;
  type?: TransactionType;
  limit?: number;
}) {
  const { year, month, type, limit } = options ?? {};

  const where: Record<string, unknown> = type
    ? {
        deletedAt: null,
        ledger: TransactionLedger.FINANCE,
        type,
      }
    : financeTransactionWhere();

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
    orderBy: { date: "desc" },
    take: limit ?? undefined,
    include: {
      income: true,
      expense: {
        include: {
          items: {
            include: {
              car: true,
            },
          },
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
  return calculateCurrentFinanceBalance();
}

export async function getMonthlyStats(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.INCOME,
        ledger: TransactionLedger.FINANCE,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.EXPENSE,
        ledger: TransactionLedger.FINANCE,
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
// Uses moment setter methods to avoid locale-sensitive string parsing
async function getHijriMonthRange(hijriYear: number, hijriMonth: number) {
  try {
    if (isNaN(hijriYear) || isNaN(hijriMonth)) {
      throw new Error(`Invalid Hijri inputs: year=${hijriYear}, month=${hijriMonth}`);
    }

    // Build start date using setter methods (locale-safe, no string parsing)
    const startHijri = moment().iYear(hijriYear).iMonth(hijriMonth - 1).iDate(1).startOf("day");

    // Build end date: first day of next Hijri month, minus 1 second
    let nextMonth = hijriMonth; // iMonth is 0-indexed so hijriMonth (1-indexed) = next month in 0-indexed
    let nextYear = hijriYear;
    if (nextMonth > 11) { // 0-indexed: month 11 = Dhu al-Hijja
      nextMonth = 0;
      nextYear++;
    }
    const endHijri = moment()
      .iYear(nextYear)
      .iMonth(nextMonth)
      .iDate(1)
      .startOf("day")
      .subtract(1, "second");

    const startDate = startHijri.toDate();
    const endDate = endHijri.toDate();

    // Validate dates are reasonable (between year 1900 and 2200)
    if (
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime()) ||
      startDate.getFullYear() < 1900 ||
      startDate.getFullYear() > 2200 ||
      endDate.getFullYear() < 1900 ||
      endDate.getFullYear() > 2200
    ) {
      throw new Error("Invalid date range from Hijri conversion");
    }

    return { startDate, endDate };
  } catch (err) {
    // Fallback to current Gregorian month
    console.warn(
      "Hijri conversion failed:",
      err,
      "Using Gregorian month fallback",
    );
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    };
  }
}

export async function getHijriMonthlyStats(
  hijriYear: number,
  hijriMonth: number,
) {
  const { startDate, endDate } = await getHijriMonthRange(
    hijriYear,
    hijriMonth,
  );

  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.INCOME,
        ledger: TransactionLedger.FINANCE,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.EXPENSE,
        ledger: TransactionLedger.FINANCE,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = income._sum.amount ?? 0;
  const totalExpense = expense._sum.amount ?? 0;

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
  };
}

export async function getTransactionsByHijriMonth(
  hijriYear: number,
  hijriMonth: number,
  carId?: string | null,
) {
  const { startDate, endDate } = await getHijriMonthRange(
    hijriYear,
    hijriMonth,
  );

  if (carId && carId !== "all") {
    // IF CAR FILTER IS ACTIVE
    // Only return EXPENSE transactions that involve the selected car
    const transactions = await prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        type: TransactionType.EXPENSE,
        ledger: TransactionLedger.FINANCE,
        deletedAt: null,
        expense: {
          items: {
            some: {
              carId,
            },
          },
        },
      },
      orderBy: { date: "asc" },
      include: {
        income: true,
        expense: {
          include: {
            items: {
              where: { carId },
              include: { car: true },
            },
          },
        },
        fuelPurchase: {
          include: { car: true },
        },
        user: {
          select: { name: true, username: true },
        },
      },
    });

    // Override the transaction amount to only include the items for the selected car
    const filteredTransactions = transactions.map((trx) => {
      const itemsTotal =
        trx.expense?.items.reduce((sum, item) => sum + item.total, 0) ?? 0;
      return {
        ...trx,
        amount: itemsTotal,
      };
    });

    const totalExpense = filteredTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );

    return {
      transactions: filteredTransactions,
      stats: {
        totalIncome: 0,
        totalExpense,
        openingBalance: 0,
        closingBalance: -totalExpense,
        previousMonthBalance: 0,
      },
    };
  }

  // Calculate opening balance from all transactions BEFORE this month
  // This is the sum of all income minus expenses before startDate
  // Note: FUEL_PURCHASE is NOT included - it's a separate ledger
  const [incomeBefore, expenseBefore] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        date: { lt: startDate },
        type: TransactionType.INCOME,
        ledger: TransactionLedger.FINANCE,
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        date: { lt: startDate },
        type: TransactionType.EXPENSE, // Only EXPENSE, not FUEL_PURCHASE
        ledger: TransactionLedger.FINANCE,
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
  ]);

  const previousMonthBalance =
    (incomeBefore._sum.amount ?? 0) - (expenseBefore._sum.amount ?? 0);

  // Get transactions for the Hijri month (INCOME and EXPENSE only, not FUEL_PURCHASE)
  const transactions = await prisma.transaction.findMany({
    where: {
      ...financeTransactionWhere(),
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
    include: {
      income: true,
      expense: {
        include: {
          items: { include: { car: true } },
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
