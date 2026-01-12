// 'use server';

import { prisma } from "@/lib/prisma";
import {
  SettlementStatus,
  SettlementType,
  SpendingTaskStatus,
  WalletEntryType,
} from "@/generated/prisma/enums";

export type TaskSummary = {
  budget: number;
  totalReceipts: number;
  diff: number;
  refundDue: number;
  reimburseDue: number;
  isLocked: boolean;
};

function calculateSummary(task: {
  funding?: { amount: number } | null;
  receipts: { totalAmount: number }[];
  settlements: { status: SettlementStatus }[];
}): TaskSummary {
  const budget = task.funding?.amount ?? 0;
  const totalReceipts = task.receipts.reduce(
    (sum, receipt) => sum + receipt.totalAmount,
    0
  );
  const diff = budget - totalReceipts;
  const refundDue = diff > 0 ? diff : 0;
  const reimburseDue = diff < 0 ? Math.abs(diff) : 0;
  const isLocked = task.settlements.some(
    (settlement) => settlement.status === SettlementStatus.DONE
  );

  return {
    budget,
    totalReceipts,
    diff,
    refundDue,
    reimburseDue,
    isLocked,
  };
}

export async function getTaskSummary(taskId: string) {
  const task = await prisma.spendingTask.findUnique({
    where: { id: taskId },
    include: {
      funding: { select: { amount: true } },
      receipts: { select: { totalAmount: true } },
      settlements: { select: { status: true } },
    },
  });

  if (!task) {
    return null;
  }

  return calculateSummary(task);
}

export async function recomputeTask(taskId: string) {
  const task = await prisma.spendingTask.findUnique({
    where: { id: taskId },
    include: {
      funding: true,
      receipts: { select: { totalAmount: true } },
      settlements: true,
    },
  });

  if (!task) {
    return null;
  }

  const summary = calculateSummary(task);
  const hasFunding = !!task.funding;
  const refundSettlement = task.settlements.find(
    (s) => s.type === SettlementType.REFUND
  );
  const reimburseSettlement = task.settlements.find(
    (s) => s.type === SettlementType.REIMBURSE
  );

  let nextStatus: SpendingTaskStatus = SpendingTaskStatus.DRAFT;
  if (!hasFunding) {
    nextStatus = SpendingTaskStatus.DRAFT;
  } else if (summary.totalReceipts === 0) {
    nextStatus = SpendingTaskStatus.FUNDED;
  } else if (summary.refundDue > 0) {
    nextStatus = SpendingTaskStatus.NEEDS_REFUND;
  } else if (summary.reimburseDue > 0) {
    nextStatus = SpendingTaskStatus.NEEDS_REIMBURSE;
  } else {
    nextStatus = SpendingTaskStatus.SETTLED;
  }

  if (summary.isLocked) {
    nextStatus = SpendingTaskStatus.SETTLED;
  }

  await prisma.$transaction(async (tx) => {
    if (!summary.isLocked && hasFunding) {
      if (summary.refundDue > 0) {
        await tx.taskSettlement.upsert({
          where: {
            taskId_type: {
              taskId,
              type: SettlementType.REFUND,
            },
          },
          update: {
            amount: summary.refundDue,
            status: SettlementStatus.PENDING,
            doneAt: null,
          },
          create: {
            taskId,
            type: SettlementType.REFUND,
            amount: summary.refundDue,
            status: SettlementStatus.PENDING,
          },
        });
      } else if (refundSettlement?.status === SettlementStatus.PENDING) {
        await tx.taskSettlement.delete({ where: { id: refundSettlement.id } });
      }

      if (summary.reimburseDue > 0) {
        await tx.taskSettlement.upsert({
          where: {
            taskId_type: {
              taskId,
              type: SettlementType.REIMBURSE,
            },
          },
          update: {
            amount: summary.reimburseDue,
            status: SettlementStatus.PENDING,
            doneAt: null,
          },
          create: {
            taskId,
            type: SettlementType.REIMBURSE,
            amount: summary.reimburseDue,
            status: SettlementStatus.PENDING,
          },
        });
      } else if (reimburseSettlement?.status === SettlementStatus.PENDING) {
        await tx.taskSettlement.delete({
          where: { id: reimburseSettlement.id },
        });
      }
    }

    if (task.status !== nextStatus) {
      await tx.spendingTask.update({
        where: { id: taskId },
        data: { status: nextStatus },
      });
    }
  });

  return summary;
}

export async function getOrCreateWallet() {
  let wallet = await prisma.wallet.findFirst();
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { name: "Global Wallet" } });
  }
  return wallet;
}

export function calculateWalletBalance(
  entries: { type: WalletEntryType; amount: number }[]
) {
  return entries.reduce(
    (sum, entry) =>
      entry.type === WalletEntryType.CREDIT
        ? sum + entry.amount
        : sum - entry.amount,
    0
  );
}
