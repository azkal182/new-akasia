"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { TaxType } from "@/generated/prisma/enums";
import { z } from "zod";

const createTaxSchema = z.object({
  carId: z.string().uuid("Invalid car ID"),
  type: z.nativeEnum(TaxType),
  dueDate: z.coerce.date(),
  notes: z.string().optional(),
  generateCycle: z.boolean().optional(),
});

const payTaxSchema = z.object({
  taxId: z.string().uuid(),
  amount: z.coerce.number().int().positive("Amount must be positive"),
  notes: z.string().optional(),
  nextDueDate: z.coerce.date().optional(),
});

export type CreateTaxInput = z.infer<typeof createTaxSchema>;
export type PayTaxInput = z.infer<typeof payTaxSchema>;

export async function getTaxes(options?: { isPaid?: boolean; carId?: string }) {
  const { isPaid, carId } = options ?? {};

  const where: Record<string, unknown> = {};
  if (isPaid !== undefined) where.isPaid = isPaid;
  if (carId) where.carId = carId;

  const taxes = await prisma.tax.findMany({
    where,
    orderBy: { dueDate: "asc" },
    include: {
      car: {
        select: { id: true, name: true, licensePlate: true },
      },
      payments: true,
    },
  });

  return taxes;
}

export async function getUpcomingTaxes(days = 30) {
  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const taxes = await prisma.tax.findMany({
    where: {
      isPaid: false,
      dueDate: { lte: endDate },
    },
    orderBy: { dueDate: "asc" },
    include: {
      car: {
        select: { name: true, licensePlate: true },
      },
    },
  });

  return taxes;
}

export async function createTax(data: CreateTaxInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const validated = createTaxSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  try {
    let tax;
    if (validated.data.generateCycle) {
      const taxesToCreate = [];
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      // 1. The initial tax
      taxesToCreate.push({
        carId: validated.data.carId,
        type: validated.data.type,
        dueDate: validated.data.dueDate,
        notes: validated.data.notes ?? null,
      });

      // 2. Backfill annual taxes until current date if type is FIVE_YEAR
      if (validated.data.type === TaxType.FIVE_YEAR) {
        const backfillDate = new Date(validated.data.dueDate);
        backfillDate.setFullYear(backfillDate.getFullYear() - 1);

        while (backfillDate > currentDate) {
          taxesToCreate.push({
            carId: validated.data.carId,
            type: TaxType.ANNUAL,
            dueDate: new Date(backfillDate),
            notes: "Auto-generated backfill from future 5-year tax",
          });
          backfillDate.setFullYear(backfillDate.getFullYear() - 1);
        }
      }

      const txResult = await prisma.$transaction(
        taxesToCreate.map((data) => prisma.tax.create({ data })),
      );
      tax = txResult[0]; // Return the first one representing the current input
    } else {
      tax = await prisma.tax.create({
        data: {
          carId: validated.data.carId,
          type: validated.data.type,
          dueDate: validated.data.dueDate,
          notes: validated.data.notes ?? null,
        },
      });
    }

    revalidatePath("/dashboard/tax");
    return { success: true, tax };
  } catch (error) {
    console.error("Failed to create tax:", error);
    return { error: "Gagal menambah pajak" };
  }
}

export async function payTax(data: PayTaxInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const validated = payTaxSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  try {
    const existingTax = await prisma.tax.findUnique({
      where: { id: validated.data.taxId },
    });

    if (!existingTax) {
      return { error: "Pajak tidak ditemukan" };
    }

    const transactions = [];

    // 1. Create payment
    transactions.push(
      prisma.taxPayment.create({
        data: {
          taxId: validated.data.taxId,
          amount: validated.data.amount,
          notes: validated.data.notes ?? null,
        },
      }),
    );

    // 2. Update current tax to paid
    transactions.push(
      prisma.tax.update({
        where: { id: validated.data.taxId },
        data: {
          isPaid: true,
          paidAt: new Date(),
        },
      }),
    );

    // 3. Create next tax if requested
    if (validated.data.nextDueDate) {
      if (existingTax.type === TaxType.FIVE_YEAR) {
        // Generate 5-year cycle: 4 annual, 1 five-year
        const cycleTaxes = [];
        for (let i = 0; i < 4; i++) {
          const nextDate = new Date(validated.data.nextDueDate);
          nextDate.setFullYear(nextDate.getFullYear() + i);
          cycleTaxes.push({
            carId: existingTax.carId,
            type: TaxType.ANNUAL,
            dueDate: nextDate,
            notes: "Auto-generated from 5-Year payment",
          });
        }

        const fifthDate = new Date(validated.data.nextDueDate);
        fifthDate.setFullYear(fifthDate.getFullYear() + 4);
        cycleTaxes.push({
          carId: existingTax.carId,
          type: TaxType.FIVE_YEAR,
          dueDate: fifthDate,
          notes: "Auto-generated from 5-Year payment",
        });

        for (const data of cycleTaxes) {
          transactions.push(prisma.tax.create({ data }));
        }
      } else {
        // For ANNUAL tax, check if ANY future tax (ANNUAL or FIVE_YEAR) already exists that month
        const targetYear = validated.data.nextDueDate.getFullYear();
        const targetMonth = validated.data.nextDueDate.getMonth();

        const startOfMonth = new Date(targetYear, targetMonth, 1);
        const endOfMonth = new Date(targetYear, targetMonth + 1, 1);

        const existingFutureTax = await prisma.tax.findFirst({
          where: {
            carId: existingTax.carId,
            isPaid: false,
            dueDate: {
              gte: startOfMonth,
              lt: endOfMonth,
            },
          },
        });

        if (existingFutureTax) {
          // Hanya update tanggalnya saja, biarkan tipe pajaknya (bisa jadi memang FIVE_YEAR)
          transactions.push(
            prisma.tax.update({
              where: { id: existingFutureTax.id },
              data: {
                dueDate: validated.data.nextDueDate,
                // optionally update notes to reflect it was synced
              },
            }),
          );
        } else {
          // Jika tidak ada data sama sekali tahun depan, default buat ANNUAL
          transactions.push(
            prisma.tax.create({
              data: {
                carId: existingTax.carId,
                type: TaxType.ANNUAL,
                dueDate: validated.data.nextDueDate,
                notes: "Auto-generated from previous payment",
              },
            }),
          );
        }
      }
    }

    await prisma.$transaction(transactions);

    revalidatePath("/dashboard/tax");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to pay tax:", error);
    return { error: "Gagal menyimpan pembayaran pajak" };
  }
}

export async function getTaxById(id: string) {
  const tax = await prisma.tax.findUnique({
    where: { id },
    include: {
      car: {
        select: { id: true, name: true, licensePlate: true },
      },
      payments: {
        orderBy: { paidAt: "desc" },
      },
    },
  });

  return tax;
}

const updateTaxSchema = z.object({
  type: z.nativeEnum(TaxType),
  dueDate: z.coerce.date(),
  notes: z.string().optional().nullable(),
});

export type UpdateTaxInput = z.infer<typeof updateTaxSchema>;

export async function updateTax(id: string, data: UpdateTaxInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const validated = updateTaxSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  try {
    const tax = await prisma.tax.update({
      where: { id },
      data: {
        type: validated.data.type,
        dueDate: validated.data.dueDate,
        notes: validated.data.notes ?? null,
      },
    });

    revalidatePath("/dashboard/tax");
    revalidatePath(`/dashboard/tax/${id}`);
    return { success: true, tax };
  } catch (error) {
    console.error("Failed to update tax:", error);
    return { error: "Gagal mengupdate pajak" };
  }
}

export async function deleteTax(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Delete payments first, then tax
    await prisma.$transaction([
      prisma.taxPayment.deleteMany({
        where: { taxId: id },
      }),
      prisma.tax.delete({
        where: { id },
      }),
    ]);

    revalidatePath("/dashboard/tax");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete tax:", error);
    return { error: "Gagal menghapus pajak" };
  }
}
