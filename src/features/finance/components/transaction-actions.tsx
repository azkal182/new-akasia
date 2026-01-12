"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Trash2, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NominalInput } from "@/components/inputs/nominal-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/utils";
import {
  updateIncomeSchema,
  updateExpenseSchema,
  type UpdateIncomeInput,
  type UpdateExpenseInput,
} from "@/features/finance/schemas/transaction.schema";
import {
  updateIncome,
  updateExpense,
  deleteIncome,
  deleteExpense,
} from "@/features/finance/actions";
import { TransactionType } from "@/generated/prisma/enums";

type TransactionItem = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: Date | string;
  income?: {
    source: string;
    notes: string | null;
  } | null;
  expense?: {
    notes: string | null;
    receiptUrl: string | null;
    items: {
      description: string;
      quantity: number;
      unitPrice: number;
      carId?: string | null;
    }[];
  } | null;
};

interface TransactionActionsProps {
  transaction: TransactionItem;
}

function getDateInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().split("T")[0];
}

export function TransactionActions({ transaction }: TransactionActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isIncome = transaction.type === TransactionType.INCOME;
  const isExpense = transaction.type === TransactionType.EXPENSE;

  const incomeDefaults = useMemo<UpdateIncomeInput>(
    () => ({
      amount: transaction.amount,
      source: transaction.income?.source ?? transaction.description,
      date: new Date(transaction.date),
      notes: transaction.income?.notes ?? "",
    }),
    [transaction]
  );

  const expenseDefaults = useMemo<UpdateExpenseInput>(
    () => ({
      date: new Date(transaction.date),
      description: transaction.description,
      notes: transaction.expense?.notes ?? "",
      items: transaction.expense?.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        carId: item.carId ?? undefined,
      })) ?? [{ description: "", quantity: 1, unitPrice: 0 }],
    }),
    [transaction]
  );

  const incomeForm = useForm<UpdateIncomeInput>({
    resolver: zodResolver(updateIncomeSchema),
    defaultValues: incomeDefaults,
  });

  const expenseForm = useForm<UpdateExpenseInput>({
    resolver: zodResolver(updateExpenseSchema),
    defaultValues: expenseDefaults,
  });

  const expenseItems = expenseForm.watch("items");
  const expenseTotal = expenseItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0
  );

  const { fields, append, remove } = useFieldArray({
    control: expenseForm.control,
    name: "items",
  });

  useEffect(() => {
    if (!editOpen) {
      incomeForm.reset(incomeDefaults);
      expenseForm.reset(expenseDefaults);
      setReceiptFile(null);
    }
  }, [editOpen, incomeDefaults, expenseDefaults, incomeForm, expenseForm]);

  if (!isIncome && !isExpense) {
    return null;
  }

  async function handleIncomeSubmit(data: UpdateIncomeInput) {
    setIsSaving(true);
    try {
      const result = await updateIncome(transaction.id, data);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Pemasukan diperbarui");
        setEditOpen(false);
      }
    } catch {
      toast.error("Gagal memperbarui pemasukan");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExpenseSubmit(data: UpdateExpenseInput) {
    setIsSaving(true);
    try {
      const result = await updateExpense(transaction.id, data, receiptFile);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Pengeluaran diperbarui");
        setEditOpen(false);
      }
    } catch {
      toast.error("Gagal memperbarui pengeluaran");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = isIncome
        ? await deleteIncome(transaction.id)
        : await deleteExpense(transaction.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(isIncome ? "Pemasukan dihapus" : "Pengeluaran dihapus");
        setDeleteOpen(false);
      }
    } catch {
      toast.error(
        isIncome ? "Gagal menghapus pemasukan" : "Gagal menghapus pengeluaran"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle>
              {isIncome ? "Ubah Pemasukan" : "Ubah Pengeluaran"}
            </DialogTitle>
            <DialogDescription>
              Pastikan data yang diperbarui sudah benar.
            </DialogDescription>
          </DialogHeader>

          {isIncome ? (
            <form
              onSubmit={incomeForm.handleSubmit(handleIncomeSubmit)}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Tanggal</Label>
                  <Input
                    type="date"
                    value={getDateInputValue(incomeForm.watch("date"))}
                    onChange={(event) =>
                      incomeForm.setValue("date", new Date(event.target.value))
                    }
                    className="border-border bg-muted/60 text-foreground"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Sumber</Label>
                  <Input
                    {...incomeForm.register("source")}
                    className="border-border bg-muted/60 text-foreground"
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Jumlah (Rp)</Label>
                  <Controller
                    control={incomeForm.control}
                    name="amount"
                    render={({ field }) => (
                      <NominalInput
                        value={field.value ?? 0}
                        onValueChange={(values) =>
                          field.onChange(values.floatValue ?? 0)
                        }
                        name={field.name}
                        onBlur={field.onBlur}
                        className="border-border bg-muted/60 text-foreground"
                        disabled={isSaving}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Catatan</Label>
                  <Textarea
                    {...incomeForm.register("notes")}
                    className="border-border bg-muted/60 text-foreground"
                    disabled={isSaving}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500"
                  disabled={isSaving}
                >
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form
              onSubmit={expenseForm.handleSubmit(handleExpenseSubmit)}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Tanggal</Label>
                  <Input
                    type="date"
                    value={getDateInputValue(expenseForm.watch("date"))}
                    onChange={(event) =>
                      expenseForm.setValue("date", new Date(event.target.value))
                    }
                    className="border-border bg-muted/60 text-foreground"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Keterangan</Label>
                  <Input
                    {...expenseForm.register("description")}
                    className="border-border bg-muted/60 text-foreground"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Nota/Struk</Label>
                {transaction.expense?.receiptUrl && (
                  <a
                    href={transaction.expense.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Lihat nota saat ini
                  </a>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setReceiptFile(event.target.files?.[0] ?? null)
                  }
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {receiptFile
                    ? receiptFile.name
                    : "Unggah nota baru (opsional)"}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground">Item</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({ description: "", quantity: 1, unitPrice: 0 })
                    }
                    className="border-border"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Item
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-lg bg-muted/40 p-3 md:grid-cols-5"
                  >
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Deskripsi
                      </Label>
                      <Input
                        {...expenseForm.register(`items.${index}.description`)}
                        className="border-border bg-muted/60 text-foreground"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Jumlah
                      </Label>
                      <Input
                        type="number"
                        {...expenseForm.register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        className="border-border bg-muted/60 text-foreground"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-1 flex items-end gap-2 md:col-span-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Harga
                        </Label>
                        <Controller
                          control={expenseForm.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <NominalInput
                              value={field.value ?? 0}
                              onValueChange={(values) =>
                                field.onChange(values.floatValue ?? 0)
                              }
                              name={field.name}
                              onBlur={field.onBlur}
                              className="border-border bg-muted/60 text-foreground"
                              disabled={isSaving}
                            />
                          )}
                        />
                      </div>
                      <Input
                        type="hidden"
                        {...expenseForm.register(`items.${index}.carId`)}
                      />
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          disabled={isSaving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-muted/60 p-3 text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatRupiah(expenseTotal)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Catatan</Label>
                <Textarea
                  {...expenseForm.register("notes")}
                  className="border-border bg-muted/60 text-foreground"
                  disabled={isSaving}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500"
                  disabled={isSaving}
                >
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle>Hapus Transaksi</DialogTitle>
            <DialogDescription>
              {isIncome
                ? "Pemasukan akan dihapus permanen."
                : "Pengeluaran akan dihapus permanen."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-500"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
