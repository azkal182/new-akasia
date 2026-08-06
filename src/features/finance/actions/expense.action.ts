'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { TransactionLedger, TransactionType } from '@/generated/prisma/enums';
import {
  createExpenseSchema,
  updateExpenseSchema,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from '../schemas/transaction.schema';
import { auth } from '@/lib/auth';
import { uploadCompressedReceipt } from '@/lib/receipt';
import { deleteObject } from '@/lib/storage';
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
  const entryDate = new Date(date);

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  let receiptUrl: string | null = null;
  if (receiptFile) {
    try {
      receiptUrl = await uploadCompressedReceipt(receiptFile, 'receipts/expense');
    } catch (uploadError: any) {
      console.error('Failed to upload receipt:', uploadError);
      return { error: `Gagal mengunggah nota/struk: ${uploadError?.message || 'Kesalahan tidak diketahui'}` };
    }
  }

  try {
    const balanceBefore = await calculateBalanceBefore(entryDate);
    const balanceAfter = balanceBefore - totalAmount;

    // Create transaction with expense relation
    const transaction = await prisma.transaction.create({
      data: {
        type: TransactionType.EXPENSE,
        ledger: TransactionLedger.FINANCE,
        amount: totalAmount,
        description,
        date: entryDate,
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
  } catch (error: any) {
    console.error('Failed to create expense:', error);
    if (receiptUrl) {
      await deleteObject(receiptUrl).catch((err) => 
        console.error('Failed to cleanup receipt after db error:', err)
      );
    }
    return { error: `Gagal menyimpan pengeluaran: ${error?.message || 'Terjadi kesalahan pada database'}` };
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

  if (
    !existing ||
    existing.ledger !== TransactionLedger.FINANCE ||
    existing.type !== TransactionType.EXPENSE ||
    !existing.expense
  ) {
    return { error: 'Transaksi pengeluaran tidak ditemukan' };
  }

  const { date, description, items, notes } = validated.data;
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const entryDate = new Date(date);

  let receiptUrl = existing.expense.receiptUrl ?? null;
  let isNewUpload = false;
  if (receiptFile) {
    try {
      receiptUrl = await uploadCompressedReceipt(receiptFile, 'receipts/expense');
      isNewUpload = true;
    } catch (uploadError: any) {
      console.error('Failed to upload receipt:', uploadError);
      return { error: `Gagal mengunggah nota/struk: ${uploadError?.message || 'Kesalahan tidak diketahui'}` };
    }
  }

  try {
    const balanceBefore = await calculateBalanceBefore(entryDate, transactionId);
    const balanceAfter = balanceBefore - totalAmount;

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
  } catch (error: any) {
    console.error('Failed to update expense:', error);
    if (isNewUpload && receiptUrl) {
      await deleteObject(receiptUrl).catch((err) => 
        console.error('Failed to cleanup receipt after db error:', err)
      );
    }
    return { error: `Gagal memperbarui pengeluaran: ${error?.message || 'Terjadi kesalahan pada database'}` };
  }
}

export async function deleteExpense(transactionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { id: true, ledger: true, type: true },
  });

  if (!existing || existing.ledger !== TransactionLedger.FINANCE || existing.type !== TransactionType.EXPENSE) {
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
