'use server';

import { prisma } from '@/lib/prisma';
import { SettlementType } from '@/generated/prisma/enums';

export async function getSpendingReport(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const tasks = await prisma.spendingTask.findMany({
    where: {
      funding: {
        is: {
          receivedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
    },
    include: {
      funding: true,
      receipts: {
        select: {
          totalAmount: true,
        },
      },
      settlements: {
        select: {
          type: true,
          status: true,
          amount: true,
          doneAt: true,
        },
      },
      createdBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      funding: {
        receivedAt: 'desc',
      },
    },
  });

  const reportTasks = tasks.map((task) => {
    const fundingAmount = task.funding?.amount ?? 0;
    const receiptsTotal = task.receipts.reduce(
      (sum, receipt) => sum + receipt.totalAmount,
      0
    );
    const diff = fundingAmount - receiptsTotal;
    const refundDue = diff > 0 ? diff : 0;
    const reimburseDue = diff < 0 ? Math.abs(diff) : 0;

    const refundSettlement = task.settlements.find(
      (settlement) => settlement.type === SettlementType.REFUND
    );
    const reimburseSettlement = task.settlements.find(
      (settlement) => settlement.type === SettlementType.REIMBURSE
    );

    return {
      id: task.id,
      title: task.title,
      createdAt: task.createdAt,
      createdBy: task.createdBy?.name ?? null,
      status: task.status,
      funding: task.funding
        ? {
            amount: task.funding.amount,
            receivedAt: task.funding.receivedAt,
            source: task.funding.source,
            notes: task.funding.notes,
          }
        : null,
      receiptsTotal,
      diff,
      refundDue,
      reimburseDue,
      refundSettlement: refundSettlement
        ? {
            status: refundSettlement.status,
            amount: refundSettlement.amount,
            doneAt: refundSettlement.doneAt,
          }
        : null,
      reimburseSettlement: reimburseSettlement
        ? {
            status: reimburseSettlement.status,
            amount: reimburseSettlement.amount,
            doneAt: reimburseSettlement.doneAt,
          }
        : null,
    };
  });

  const totals = reportTasks.reduce(
    (acc, task) => {
      acc.totalFunding += task.funding?.amount ?? 0;
      acc.totalReceipts += task.receiptsTotal;
      acc.totalRefundDue += task.refundDue;
      acc.totalReimburseDue += task.reimburseDue;
      if (task.receiptsTotal === 0) {
        acc.tasksWithoutReceipts += 1;
      }
      return acc;
    },
    {
      totalFunding: 0,
      totalReceipts: 0,
      totalRefundDue: 0,
      totalReimburseDue: 0,
      tasksWithoutReceipts: 0,
    }
  );

  const unfundedTasks = await prisma.spendingTask.findMany({
    where: {
      funding: null,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      createdBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return {
    period: {
      year,
      month,
      startDate,
      endDate,
    },
    totals: {
      ...totals,
      taskCount: reportTasks.length,
      unfundedCount: unfundedTasks.length,
    },
    tasks: reportTasks,
    unfundedTasks,
  };
}
