import { z } from 'zod';
import { WalletEntryType } from '@/generated/prisma/enums';

export const createTaskSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter'),
  description: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter'),
  description: z.string().optional(),
});

export const createFundingSchema = z.object({
  amount: z.coerce.number().int().positive('Jumlah harus lebih dari 0'),
  receivedAt: z.coerce.date().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export const receiptItemSchema = z.object({
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  quantity: z.coerce.number().int().min(1, 'Qty minimal 1'),
  unitPrice: z.coerce.number().int().min(0, 'Harga minimal 0'),
});

export const createReceiptSchema = z.object({
  vendor: z.string().optional(),
  receiptNo: z.string().optional(),
  receiptDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  totalAmount: z.coerce.number().int().positive('Total wajib diisi'),
  items: z.array(receiptItemSchema).min(1, 'Minimal 1 item'),
});

export const createCashbackSchema = z.object({
  amount: z.coerce.number().int().positive('Jumlah wajib diisi'),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  occurredAt: z.coerce.date().optional(),
});

export const createWalletEntrySchema = z.object({
  type: z.nativeEnum(WalletEntryType),
  amount: z.coerce.number().int().positive('Jumlah wajib diisi'),
  description: z.string().optional(),
  occurredAt: z.coerce.date().optional(),
  attachmentUrl: z.string().url().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateFundingInput = z.infer<typeof createFundingSchema>;
export type ReceiptItemInput = z.infer<typeof receiptItemSchema>;
export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;
export type CreateCashbackInput = z.infer<typeof createCashbackSchema>;
export type CreateWalletEntryInput = z.infer<typeof createWalletEntrySchema>;
