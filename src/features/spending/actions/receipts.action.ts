'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createReceiptSchema, type CreateReceiptInput } from '../schemas';
import { getTaskSummary, recomputeTask } from '../utils';
import { uploadCompressedAttachment } from '@/lib/receipt';

export async function createReceipt(
  taskId: string,
  data: CreateReceiptInput,
  files: File[]
) {
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

  if (summary.budget <= 0) {
    return { error: 'Pendanaan wajib diisi' };
  }

  const validated = createReceiptSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  if (!files || files.length === 0) {
    return { error: 'Lampiran wajib diunggah' };
  }

  const itemsTotal = validated.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  if (itemsTotal !== validated.data.totalAmount) {
    return { error: `Total nota harus sama dengan jumlah item (${itemsTotal})` };
  }

  const attachments = await Promise.all(
    files.map(async (file) => uploadCompressedAttachment(file, 'receipts/spending'))
  );

  const receipt = await prisma.receipt.create({
    data: {
      taskId,
      vendor: validated.data.vendor ?? null,
      receiptNo: validated.data.receiptNo ?? null,
      receiptDate: validated.data.receiptDate ?? null,
      notes: validated.data.notes ?? null,
      totalAmount: validated.data.totalAmount,
      attachments: {
        create: attachments.map((file) => ({
          fileUrl: file.fileUrl,
          fileName: file.fileName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
        })),
      },
      items: {
        create: validated.data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
    include: {
      attachments: true,
      items: true,
    },
  });

  await recomputeTask(taskId);
  revalidatePath('/spending');
  revalidatePath(`/spending/${taskId}`);

  return { success: true, receipt };
}

export async function deleteReceipt(receiptId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Tidak memiliki akses' };
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    select: { taskId: true },
  });

  if (!receipt) {
    return { error: 'Nota tidak ditemukan' };
  }

  const summary = await getTaskSummary(receipt.taskId);
  if (!summary) {
    return { error: 'Anggaran tidak ditemukan' };
  }

  if (summary.isLocked) {
    return { error: 'Anggaran sudah dikunci' };
  }

  await prisma.receipt.delete({
    where: { id: receiptId },
  });

  await recomputeTask(receipt.taskId);
  revalidatePath('/spending');
  revalidatePath(`/spending/${receipt.taskId}`);

  return { success: true };
}
