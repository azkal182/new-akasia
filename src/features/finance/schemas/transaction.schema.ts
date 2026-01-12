import { z } from 'zod';

export const createIncomeSchema = z.object({
  amount: z.coerce.number().int().positive('Amount must be a positive number'),
  source: z.string().min(1, 'Source is required'),
  date: z.coerce.date(),
  notes: z.string().optional(),
});

export const expenseItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
  unitPrice: z.coerce.number().int().positive('Unit price must be positive'),
  carId: z.string().uuid().optional().nullable(),
});

export const createExpenseSchema = z.object({
  date: z.coerce.date(),
  description: z.string().min(1, 'Description is required'),
  items: z.array(expenseItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

export const transactionFilterSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const hijriFilterSchema = z.object({
  hijriYear: z.coerce.number().int().min(1400).max(1500),
  hijriMonth: z.coerce.number().int().min(1).max(12),
});

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ExpenseItemInput = z.infer<typeof expenseItemSchema>;
export type TransactionFilter = z.infer<typeof transactionFilterSchema>;
export type HijriFilter = z.infer<typeof hijriFilterSchema>;
