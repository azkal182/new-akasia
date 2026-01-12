'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { SettlementStatus, SettlementType } from '@/generated/prisma/enums';
import { getTaskSummary, recomputeTask } from '../utils';

export async function markRefundDone(taskId: string, notes?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const summary = await getTaskSummary(taskId);
  if (!summary) {
    return { error: 'Anggaran tidak ditemukan' };
  }

  if (summary.refundDue <= 0) {
    return { error: 'SETTLEMENT_NOT_REQUIRED' };
  }

  await prisma.taskSettlement.upsert({
    where: {
      taskId_type: {
        taskId,
        type: SettlementType.REFUND,
      },
    },
    update: {
      amount: summary.refundDue,
      status: SettlementStatus.DONE,
      doneAt: new Date(),
      notes: notes ?? null,
    },
    create: {
      taskId,
      type: SettlementType.REFUND,
      amount: summary.refundDue,
      status: SettlementStatus.DONE,
      doneAt: new Date(),
      notes: notes ?? null,
    },
  });

  await recomputeTask(taskId);
  revalidatePath('/spending');
  revalidatePath(`/spending/${taskId}`);

  return { success: true };
}

export async function markReimburseDone(taskId: string, notes?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const summary = await getTaskSummary(taskId);
  if (!summary) {
    return { error: 'Anggaran tidak ditemukan' };
  }

  if (summary.reimburseDue <= 0) {
    return { error: 'SETTLEMENT_NOT_REQUIRED' };
  }

  await prisma.taskSettlement.upsert({
    where: {
      taskId_type: {
        taskId,
        type: SettlementType.REIMBURSE,
      },
    },
    update: {
      amount: summary.reimburseDue,
      status: SettlementStatus.DONE,
      doneAt: new Date(),
      notes: notes ?? null,
    },
    create: {
      taskId,
      type: SettlementType.REIMBURSE,
      amount: summary.reimburseDue,
      status: SettlementStatus.DONE,
      doneAt: new Date(),
      notes: notes ?? null,
    },
  });

  await recomputeTask(taskId);
  revalidatePath('/spending');
  revalidatePath(`/spending/${taskId}`);

  return { success: true };
}
