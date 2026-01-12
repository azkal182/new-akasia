'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createFundingSchema, type CreateFundingInput } from '../schemas';
import { getTaskSummary, recomputeTask } from '../utils';

export async function createTaskFunding(taskId: string, data: CreateFundingInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const summary = await getTaskSummary(taskId);
  if (!summary) {
    return { error: 'Anggaran tidak ditemukan' };
  }

  if (summary.isLocked) {
    return { error: 'TASK_LOCKED' };
  }

  const existingFunding = await prisma.taskFunding.findUnique({
    where: { taskId },
  });
  if (existingFunding) {
    return { error: 'FUNDING_ALREADY_EXISTS' };
  }

  const validated = createFundingSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const funding = await prisma.taskFunding.create({
    data: {
      taskId,
      amount: validated.data.amount,
      receivedAt: validated.data.receivedAt ?? new Date(),
      source: validated.data.source ?? 'Yayasan',
      notes: validated.data.notes ?? null,
    },
  });

  await recomputeTask(taskId);
  revalidatePath('/spending');
  revalidatePath(`/spending/${taskId}`);

  return { success: true, funding };
}

export async function updateTaskFunding(taskId: string, data: CreateFundingInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const summary = await getTaskSummary(taskId);
  if (!summary) {
    return { error: 'Anggaran tidak ditemukan' };
  }

  if (summary.isLocked) {
    return { error: 'TASK_LOCKED' };
  }

  const validated = createFundingSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const funding = await prisma.taskFunding.update({
    where: { taskId },
    data: {
      amount: validated.data.amount,
      receivedAt: validated.data.receivedAt ?? new Date(),
      source: validated.data.source ?? 'Yayasan',
      notes: validated.data.notes ?? null,
    },
  });

  await recomputeTask(taskId);
  revalidatePath('/spending');
  revalidatePath(`/spending/${taskId}`);

  return { success: true, funding };
}
