'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { TransactionType } from '@/generated/prisma/enums';
import { createExpenseSchema, type CreateExpenseInput } from '../schemas/transaction.schema';
import { auth } from '@/lib/auth';
import { uploadCompressedReceipt } from '@/lib/receipt';

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

export async function deleteExpense(transactionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    // Soft delete
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { deletedAt: new Date() },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/finance');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return { error: 'Gagal menghapus pengeluaran' };
  }
}
