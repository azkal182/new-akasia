'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { TransactionType } from '@/generated/prisma/enums';
import {
  createExpenseSchema,
  updateExpenseSchema,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from '../schemas/transaction.schema';
import { auth } from '@/lib/auth';
import { uploadCompressedReceipt } from '@/lib/receipt';
import { calculateBalanceBefore } from './balance.util';

export async function createExpense(data: CreateExpenseInput, receiptFile?: File | null) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const validated = createExpenseSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { date, description, items, notes } = validated.data;

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  try {
    // Upload receipt if provided
    let receiptUrl: string | null = null;
    if (receiptFile) {
      receiptUrl = await uploadCompressedReceipt(receiptFile, 'receipts/expense');
    }

    // Get recent transaction for balance calculation
    const lastTransaction = await prisma.transaction.findFirst({
      orderBy: { date: 'desc' },
    });

    const balanceBefore = lastTransaction?.balanceAfter ?? 0;
    const balanceAfter = balanceBefore - totalAmount;

    // Create transaction with expense relation
    const transaction = await prisma.transaction.create({
      data: {
        type: TransactionType.EXPENSE,
        amount: totalAmount,
        description,
        date: new Date(date),
        balanceBefore,
        balanceAfter,
        userId: session.user.id,
        expense: {
          create: {
            receiptUrl,
            notes: notes ?? null,
            items: {
              create: items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.quantity * item.unitPrice,
                carId: item.carId ?? null,
              })),
            },
          },
        },
      },
      include: {
        expense: {
          include: {
            items: true,
          },
        },
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/finance');

    return { success: true, transaction };
  } catch (error) {
    console.error('Failed to create expense:', error);
    return { error: 'Gagal menyimpan pengeluaran' };
  }
}

export async function updateExpense(
  transactionId: string,
  data: UpdateExpenseInput,
  receiptFile?: File | null
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const validated = updateExpenseSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      expense: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!existing || existing.type !== TransactionType.EXPENSE || !existing.expense) {
    return { error: 'Transaksi pengeluaran tidak ditemukan' };
  }

  const { date, description, items, notes } = validated.data;
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const entryDate = new Date(date);

  let receiptUrl = existing.expense.receiptUrl ?? null;
  if (receiptFile) {
    receiptUrl = await uploadCompressedReceipt(receiptFile, 'receipts/expense');
  }

  const balanceBefore = await calculateBalanceBefore(entryDate, transactionId);
  const balanceAfter = balanceBefore - totalAmount;

  try {
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        amount: totalAmount,
        description,
        date: entryDate,
        balanceBefore,
        balanceAfter,
        expense: {
          update: {
            receiptUrl,
            notes: notes ?? null,
            items: {
              deleteMany: {},
              create: items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.quantity * item.unitPrice,
                carId: item.carId ?? null,
              })),
            },
          },
        },
      },
      include: {
        expense: {
          include: {
            items: true,
          },
        },
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/finance');

    return { success: true, transaction };
  } catch (error) {
    console.error('Failed to update expense:', error);
    return { error: 'Gagal memperbarui pengeluaran' };
  }
}

export async function deleteExpense(transactionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { id: true, type: true },
  });

  if (!existing || existing.type !== TransactionType.EXPENSE) {
    return { error: 'Transaksi pengeluaran tidak ditemukan' };
  }

  try {
    await prisma.transaction.delete({
      where: { id: transactionId },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/finance');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return { error: 'Gagal menghapus pengeluaran' };
  }
}
