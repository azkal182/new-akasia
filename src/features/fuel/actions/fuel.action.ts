"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { TransactionLedger, TransactionType } from "@/generated/prisma/enums";
import { z } from "zod";
import moment from "moment-hijri";
import { uploadCompressedReceipt } from "@/lib/receipt";
import { deleteObject } from "@/lib/storage";
import {
  calculateFuelBalanceBefore,
} from "@/features/finance/actions/balance.util";
import { fuelTransactionWhere } from "@/features/finance/actions/transaction-filters";

const purchaseFuelSchema = z.object({
  carId: z.string().uuid("Invalid car ID"),
  totalAmount: z.coerce.number().int().positive("Total wajib diisi"),
  date: z.coerce.date(),
  notes: z.string().optional(),
});

const receiveIncomeSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  source: z.string().min(1, "Source is required"),
  date: z.coerce.date(),
  notes: z.string().optional(),
});

const updateFuelIncomeSchema = receiveIncomeSchema;
const updateFuelPurchaseSchema = purchaseFuelSchema;

export type PurchaseFuelInput = z.infer<typeof purchaseFuelSchema>;
export type ReceiveIncomeInput = z.infer<typeof receiveIncomeSchema>;
export type UpdateFuelIncomeInput = z.infer<typeof updateFuelIncomeSchema>;
export type UpdateFuelPurchaseInput = z.infer<typeof updateFuelPurchaseSchema>;

export async function purchaseFuel(
  data: PurchaseFuelInput,
  receiptFile?: File | null,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const validated = purchaseFuelSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  if (!receiptFile) {
    return { error: "Nota wajib diupload" };
  }

  const { carId, totalAmount, date, notes } = validated.data;
  const entryDate = new Date(date);

  try {
    const receiptUrl = await uploadCompressedReceipt(
      receiptFile,
      "receipts/fuel",
    );
    const balanceBefore = await calculateFuelBalanceBefore(entryDate);
    const balanceAfter = balanceBefore - totalAmount;

    // Get car info
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) {
      return { error: "Mobil tidak ditemukan" };
    }

    // Create transaction with fuel purchase
    const transaction = await prisma.transaction.create({
      data: {
        type: TransactionType.FUEL_PURCHASE,
        ledger: TransactionLedger.FUEL,
        amount: totalAmount,
        description: `Pembelian BBM - ${car.name} (${car.licensePlate})`,
        date: entryDate,
        balanceBefore,
        balanceAfter,
        userId: session.user.id,
        fuelPurchase: {
          create: {
            carId,
            literAmount: 0,
            pricePerLiter: 0,
            totalAmount,
            receiptUrl,
            notes: notes ?? null,
          },
        },
      },
      include: {
        fuelPurchase: true,
      },
    });

    revalidateFuelPaths();

    return { success: true, transaction };
  } catch (error) {
    console.error("Failed to purchase fuel:", error);
    return { error: "Gagal menyimpan pembelian BBM" };
  }
}

export async function receiveFuelIncome(data: ReceiveIncomeInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const validated = receiveIncomeSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { amount, source, date, notes } = validated.data;
  const entryDate = new Date(date);

  try {
    const balanceBefore = await calculateFuelBalanceBefore(entryDate);
    const balanceAfter = balanceBefore + amount;

    const transaction = await prisma.transaction.create({
      data: {
        type: TransactionType.INCOME,
        ledger: TransactionLedger.FUEL,
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

    revalidateFuelPaths();

    return { success: true, transaction };
  } catch (error) {
    console.error("Failed to receive income:", error);
    return { error: "Gagal menyimpan pemasukan" };
  }
}

export async function updateFuelIncome(
  transactionId: string,
  data: UpdateFuelIncomeInput,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const validated = updateFuelIncomeSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true,
      ledger: true,
      type: true,
      income: { select: { id: true } },
    },
  });

  if (
    !existing ||
    existing.ledger !== TransactionLedger.FUEL ||
    existing.type !== TransactionType.INCOME ||
    !existing.income
  ) {
    return { error: "Transaksi pemasukan BBM tidak ditemukan" };
  }

  const { amount, source, date, notes } = validated.data;
  const entryDate = new Date(date);
  const balanceBefore = await calculateFuelBalanceBefore(entryDate, transactionId);
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
      include: { income: true },
    });

    revalidateFuelPaths();

    return { success: true, transaction };
  } catch (error) {
    console.error("Failed to update fuel income:", error);
    return { error: "Gagal memperbarui pemasukan BBM" };
  }
}

export async function deleteFuelIncome(transactionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { id: true, ledger: true, type: true },
  });

  if (
    !existing ||
    existing.ledger !== TransactionLedger.FUEL ||
    existing.type !== TransactionType.INCOME
  ) {
    return { error: "Transaksi pemasukan BBM tidak ditemukan" };
  }

  try {
    await prisma.transaction.delete({ where: { id: transactionId } });
    revalidateFuelPaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to delete fuel income:", error);
    return { error: "Gagal menghapus pemasukan BBM" };
  }
}

export async function updateFuelPurchase(
  transactionId: string,
  data: UpdateFuelPurchaseInput,
  receiptFile?: File | null,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const validated = updateFuelPurchaseSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      fuelPurchase: true,
    },
  });

  if (
    !existing ||
    existing.ledger !== TransactionLedger.FUEL ||
    existing.type !== TransactionType.FUEL_PURCHASE ||
    !existing.fuelPurchase
  ) {
    return { error: "Transaksi pembelian BBM tidak ditemukan" };
  }

  const { carId, totalAmount, date, notes } = validated.data;
  const entryDate = new Date(date);

  try {
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) {
      return { error: "Mobil tidak ditemukan" };
    }

    const oldReceiptUrl = existing.fuelPurchase.receiptUrl;
    let receiptUrl = oldReceiptUrl;
    if (receiptFile) {
      receiptUrl = await uploadCompressedReceipt(receiptFile, "receipts/fuel");
    }

    const balanceBefore = await calculateFuelBalanceBefore(entryDate, transactionId);
    const balanceAfter = balanceBefore - totalAmount;

    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        amount: totalAmount,
        description: `Pembelian BBM - ${car.name} (${car.licensePlate})`,
        date: entryDate,
        balanceBefore,
        balanceAfter,
        fuelPurchase: {
          update: {
            carId,
            totalAmount,
            receiptUrl,
            notes: notes ?? null,
          },
        },
      },
      include: {
        fuelPurchase: {
          include: { car: true },
        },
      },
    });

    if (receiptFile && oldReceiptUrl && oldReceiptUrl !== receiptUrl) {
      deleteObject(oldReceiptUrl).catch((error) => {
        console.warn("Failed to delete old fuel receipt:", error);
      });
    }

    revalidateFuelPaths();

    return { success: true, transaction };
  } catch (error) {
    console.error("Failed to update fuel purchase:", error);
    return { error: "Gagal memperbarui pembelian BBM" };
  }
}

export async function deleteFuelPurchase(transactionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      fuelPurchase: {
        select: { receiptUrl: true },
      },
    },
  });

  if (
    !existing ||
    existing.ledger !== TransactionLedger.FUEL ||
    existing.type !== TransactionType.FUEL_PURCHASE ||
    !existing.fuelPurchase
  ) {
    return { error: "Transaksi pembelian BBM tidak ditemukan" };
  }

  try {
    await prisma.transaction.delete({ where: { id: transactionId } });

    if (existing.fuelPurchase.receiptUrl) {
      deleteObject(existing.fuelPurchase.receiptUrl).catch((error) => {
        console.warn("Failed to delete fuel receipt:", error);
      });
    }

    revalidateFuelPaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to delete fuel purchase:", error);
    return { error: "Gagal menghapus pembelian BBM" };
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
    const hijriStart = moment(`${hijriYear}/${hijriMonth}/1`, "iYYYY/iM/iD");
    const hijriEnd = moment(
      `${hijriYear}/${hijriMonth}/1`,
      "iYYYY/iM/iD",
    ).endOf("iMonth");
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
      ...fuelTransactionWhere(),
      date: {
        gte: startDate,
        lte: endDate,
      },
      deletedAt: null,
    },
    orderBy: { date: "desc" },
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

function revalidateFuelPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/fuel");
  revalidatePath("/dashboard/fuel/report");
}

export async function getFuelMonthlyReport(
  hijriYear: number,
  hijriMonth: number,
) {
  // Convert Hijri to Gregorian for date range
  let startDate: Date;
  let endDate: Date;
  let hijriMonthName: string;
  let hijriYearStr: string;

  try {
    // Build start and end of the requested Hijri month
    const startStr = `${hijriYear}/${hijriMonth}/1`;
    const startMoment = moment(startStr, "iYYYY/iM/iD");

    // For end date, go to first of next month and subtract 1 day
    let nextMonth = hijriMonth + 1;
    let nextYear = hijriYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    const endStr = `${nextYear}/${nextMonth}/1`;
    const endMoment = moment(endStr, "iYYYY/iM/iD")
      .subtract(1, "day")
      .endOf("day");

    startDate = startMoment.toDate();
    endDate = endMoment.toDate();
    hijriMonthName = startMoment.format("iMMMM");
    hijriYearStr = String(hijriYear);

    // Validate dates are reasonable
    if (
      startDate.getFullYear() < 1900 ||
      startDate.getFullYear() > 2200 ||
      endDate.getFullYear() < 1900 ||
      endDate.getFullYear() > 2200 ||
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime())
    ) {
      throw new Error("Invalid date range from Hijri conversion");
    }
  } catch (err) {
    // Fallback to current Gregorian month if Hijri conversion fails
    console.warn(
      "Hijri conversion failed:",
      err,
      "Using Gregorian month fallback",
    );
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    hijriMonthName = moment().format("iMMMM");
    hijriYearStr = moment().format("iYYYY");
  }

  const [incomeTotal, expenseTotal] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.INCOME,
        ledger: TransactionLedger.FUEL,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.FUEL_PURCHASE,
        ledger: TransactionLedger.FUEL,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
  ]);

  // Get fuel usage per car from the transaction ledger date, not FuelPurchase.createdAt.
  const fuelPurchasesForCars = await prisma.fuelPurchase.findMany({
    where: {
      transaction: {
        type: TransactionType.FUEL_PURCHASE,
        ledger: TransactionLedger.FUEL,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
    },
    select: {
      carId: true,
      totalAmount: true,
    },
  });

  const fuelByCarMap = new Map<string, { carId: string; amount: number; count: number }>();
  for (const purchase of fuelPurchasesForCars) {
    const existing = fuelByCarMap.get(purchase.carId);
    if (existing) {
      existing.amount += purchase.totalAmount;
      existing.count += 1;
    } else {
      fuelByCarMap.set(purchase.carId, {
        carId: purchase.carId,
        amount: purchase.totalAmount,
        count: 1,
      });
    }
  }
  const fuelBycar = Array.from(fuelByCarMap.values());

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
      carName: car?.name ?? "Unknown",
      carPlate: car?.licensePlate ?? "",
      _sum: { totalAmount: f.amount },
      _count: { _all: f.count },
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
    hijriYear: parseInt(now.format("iYYYY")),
    hijriMonth: parseInt(now.format("iM")),
    hijriMonthName: now.format("iMMMM"),
    hijriDate: now.format("iD iMMMM iYYYY"),
  };
}

// Helper function to convert Hijri date range to Gregorian
function getHijriMonthRange(hijriYear: number, hijriMonth: number) {
  try {
    const startStr = `${hijriYear}/${hijriMonth}/1`;
    const startHijri = moment(startStr, "iYYYY/iM/iD");

    let nextMonth = hijriMonth + 1;
    let nextYear = hijriYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    const endStr = `${nextYear}/${nextMonth}/1`;
    const endHijri = moment(endStr, "iYYYY/iM/iD")
      .subtract(1, "day")
      .endOf("day");

    const startDate = startHijri.toDate();
    const endDate = endHijri.toDate();

    if (
      startDate.getFullYear() < 1900 ||
      startDate.getFullYear() > 2200 ||
      endDate.getFullYear() < 1900 ||
      endDate.getFullYear() > 2200 ||
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime())
    ) {
      throw new Error("Invalid date range from Hijri conversion");
    }

    return { startDate, endDate };
  } catch (err) {
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

/**
 * Get fuel purchases by Hijri month with stats for report
 */
export async function getFuelPurchasesByHijriMonth(
  hijriYear: number,
  hijriMonth: number,
  carId?: string,
) {
  const { startDate, endDate } = getHijriMonthRange(hijriYear, hijriMonth);

  const fuelWhere: Record<string, unknown> = {
    transaction: {
      type: TransactionType.FUEL_PURCHASE,
      ledger: TransactionLedger.FUEL,
      date: { gte: startDate, lte: endDate },
      deletedAt: null,
    },
  };

  if (carId) {
    fuelWhere.carId = carId;
  }

  // Get fuel purchases
  const purchases = await prisma.fuelPurchase.findMany({
    where: fuelWhere,
    orderBy: { transaction: { date: "desc" } },
    include: {
      car: { select: { id: true, name: true, licensePlate: true } },
      transaction: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });

  // Calculate stats
  const totalPurchases = purchases.length;
  const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

  // Get income for this period (fuel fund)
  const incomeTotal = await prisma.transaction.aggregate({
    where: {
      type: TransactionType.INCOME,
      ledger: TransactionLedger.FUEL,
      date: { gte: startDate, lte: endDate },
      deletedAt: null,
    },
    _sum: { amount: true },
  });
  const totalIncome = incomeTotal._sum.amount ?? 0;

  // Unique cars
  const uniqueCars = new Set(purchases.map((p) => p.carId)).size;

  // Fuel by car summary
  const fuelByCarMap = new Map<
    string,
    { name: string; plate: string | null; amount: number; count: number }
  >();
  for (const p of purchases) {
    const existing = fuelByCarMap.get(p.carId);
    if (existing) {
      existing.amount += p.totalAmount;
      existing.count += 1;
    } else {
      fuelByCarMap.set(p.carId, {
        name: p.car.name,
        plate: p.car.licensePlate,
        amount: p.totalAmount,
        count: 1,
      });
    }
  }
  const fuelByCar = Array.from(fuelByCarMap.values()).sort(
    (a, b) => b.amount - a.amount,
  );

  return {
    purchases,
    stats: {
      totalPurchases,
      totalAmount,
      totalIncome,
      balance: totalIncome - totalAmount,
      uniqueCars,
    },
    fuelByCar,
    dateRange: {
      startDate,
      endDate,
    },
  };
}
