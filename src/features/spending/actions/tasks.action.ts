'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createTaskSchema, updateTaskSchema, type CreateTaskInput, type UpdateTaskInput } from '../schemas';
import { SpendingTaskStatus } from '@/generated/prisma/enums';
import { getTaskSummary } from '../utils';

export async function createSpendingTask(data: CreateTaskInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Tidak memiliki akses' };
  }

  const validated = createTaskSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const task = await prisma.spendingTask.create({
    data: {
      title: validated.data.title,
      description: validated.data.description ?? null,
      createdById: session.user.id,
    },
  });

  revalidatePath('/spending');
  return { success: true, task };
}

export async function updateSpendingTask(taskId: string, data: UpdateTaskInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Tidak memiliki akses' };
  }

  const summary = await getTaskSummary(taskId);
  if (!summary) {
    return { error: 'Anggaran tidak ditemukan' };
  }

  if (summary.isLocked) {
    return { error: 'Anggaran sudah dikunci' };
  }

  const validated = updateTaskSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const task = await prisma.spendingTask.update({
    where: { id: taskId },
    data: {
      title: validated.data.title,
      description: validated.data.description ?? null,
    },
  });

  revalidatePath(`/spending/${taskId}`);
  revalidatePath('/spending');
  return { success: true, task };
}

export async function getSpendingTasks(status?: SpendingTaskStatus) {
  const tasks = await prisma.spendingTask.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      funding: { select: { amount: true } },
      receipts: { select: { totalAmount: true } },
      settlements: { select: { status: true } },
      createdBy: { select: { name: true } },
    },
  });

  return tasks.map((task) => {
    const budget = task.funding?.amount ?? 0;
    const totalReceipts = task.receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
    const diff = budget - totalReceipts;
    return {
      ...task,
      summary: {
        budget,
        totalReceipts,
        diff,
        refundDue: diff > 0 ? diff : 0,
        reimburseDue: diff < 0 ? Math.abs(diff) : 0,
        isLocked: task.settlements.some((settlement) => settlement.status === 'DONE'),
      },
    };
  });
}

export async function getSpendingTaskById(taskId: string) {
  const task = await prisma.spendingTask.findUnique({
    where: { id: taskId },
    include: {
      funding: true,
      receipts: {
        include: {
          attachments: true,
          items: true,
          cashbacks: { orderBy: { occurredAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      },
      settlements: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!task) return null;

  const budget = task.funding?.amount ?? 0;
  const totalReceipts = task.receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const diff = budget - totalReceipts;
  const refundDue = diff > 0 ? diff : 0;
  const reimburseDue = diff < 0 ? Math.abs(diff) : 0;
  const isLocked = task.settlements.some((settlement) => settlement.status === 'DONE');

  return {
    task,
    summary: {
      budget,
      totalReceipts,
      diff,
      refundDue,
      reimburseDue,
      isLocked,
    },
  };
}
