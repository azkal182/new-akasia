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
});

const payTaxSchema = z.object({
  taxId: z.string().uuid(),
  amount: z.coerce.number().int().positive("Amount must be positive"),
  notes: z.string().optional(),
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
    const tax = await prisma.tax.create({
      data: {
        carId: validated.data.carId,
        type: validated.data.type,
        dueDate: validated.data.dueDate,
        notes: validated.data.notes ?? null,
      },
    });

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
    // Create payment and update tax status
    await prisma.$transaction([
      prisma.taxPayment.create({
        data: {
          taxId: validated.data.taxId,
          amount: validated.data.amount,
          notes: validated.data.notes ?? null,
        },
      }),
      prisma.tax.update({
        where: { id: validated.data.taxId },
        data: {
          isPaid: true,
          paidAt: new Date(),
        },
      }),
    ]);

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
