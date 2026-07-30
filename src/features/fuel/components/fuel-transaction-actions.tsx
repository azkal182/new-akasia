"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FileImage, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NominalInput } from "@/components/inputs/nominal-input";
import { TransactionType } from "@/generated/prisma/enums";
import {
  deleteFuelIncome,
  deleteFuelPurchase,
  updateFuelIncome,
  updateFuelPurchase,
} from "@/features/fuel/actions";
import { normalizeStorageUrl } from "@/lib/normalize-storage-url";

const fuelIncomeSchema = z.object({
  amount: z.coerce.number().int().positive("Jumlah wajib diisi"),
  source: z.string().min(1, "Sumber wajib diisi"),
  date: z.coerce.date(),
  notes: z.string().optional(),
});

const fuelPurchaseSchema = z.object({
  carId: z.string().uuid("Pilih kendaraan"),
  totalAmount: z.coerce.number().int().positive("Total wajib diisi"),
  date: z.coerce.date(),
  notes: z.string().optional(),
});

type FuelIncomeForm = z.infer<typeof fuelIncomeSchema>;
type FuelPurchaseForm = z.infer<typeof fuelPurchaseSchema>;

type CarOption = {
  id: string;
  name: string;
  licensePlate: string | null;
};

type FuelTransactionItem = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: Date | string;
  income?: {
    source: string;
    notes: string | null;
  } | null;
  fuelPurchase?: {
    carId: string;
    totalAmount: number;
    receiptUrl: string | null;
    notes: string | null;
    car?: CarOption | null;
  } | null;
};

type FuelTransactionActionsProps = {
  transaction: FuelTransactionItem;
  cars: CarOption[];
};

function getDateInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

export function FuelTransactionActions({
  transaction,
  cars,
}: FuelTransactionActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isIncome = transaction.type === TransactionType.INCOME;
  const isPurchase = transaction.type === TransactionType.FUEL_PURCHASE;
  const receiptUrl = normalizeStorageUrl(transaction.fuelPurchase?.receiptUrl ?? null);

  const incomeDefaults = useMemo<FuelIncomeForm>(
    () => ({
      amount: transaction.amount,
      source: transaction.income?.source ?? transaction.description,
      date: new Date(transaction.date),
      notes: transaction.income?.notes ?? "",
    }),
    [transaction]
  );

  const purchaseDefaults = useMemo<FuelPurchaseForm>(
    () => ({
      carId: transaction.fuelPurchase?.carId ?? "",
      totalAmount: transaction.amount,
      date: new Date(transaction.date),
      notes: transaction.fuelPurchase?.notes ?? "",
    }),
    [transaction]
  );

  const incomeForm = useForm<FuelIncomeForm>({
    resolver: zodResolver(fuelIncomeSchema),
    defaultValues: incomeDefaults,
  });

  const purchaseForm = useForm<FuelPurchaseForm>({
    resolver: zodResolver(fuelPurchaseSchema),
    defaultValues: purchaseDefaults,
  });

  useEffect(() => {
    if (!editOpen) {
      incomeForm.reset(incomeDefaults);
      purchaseForm.reset(purchaseDefaults);
      setReceiptFile(null);
    }
  }, [editOpen, incomeDefaults, incomeForm, purchaseDefaults, purchaseForm]);

  if (!isIncome && !isPurchase) return null;

  async function handleIncomeSubmit(data: FuelIncomeForm) {
    setIsSaving(true);
    try {
      const result = await updateFuelIncome(transaction.id, data);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Pemasukan BBM diperbarui");
        setEditOpen(false);
        router.refresh();
      }
    } catch {
      toast.error("Gagal memperbarui pemasukan BBM");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePurchaseSubmit(data: FuelPurchaseForm) {
    setIsSaving(true);
    try {
      const result = await updateFuelPurchase(transaction.id, data, receiptFile);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Pembelian BBM diperbarui");
        setEditOpen(false);
        setReceiptFile(null);
        router.refresh();
      }
    } catch {
      toast.error("Gagal memperbarui pembelian BBM");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = isIncome
        ? await deleteFuelIncome(transaction.id)
        : await deleteFuelPurchase(transaction.id);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(isIncome ? "Pemasukan BBM dihapus" : "Pembelian BBM dihapus");
        setDeleteOpen(false);
        router.refresh();
      }
    } catch {
      toast.error(isIncome ? "Gagal menghapus pemasukan BBM" : "Gagal menghapus pembelian BBM");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setEditOpen(true)}
        aria-label="Edit transaksi BBM"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {receiptUrl && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setReceiptOpen(true)}
          aria-label="Lihat nota BBM"
        >
          <FileImage className="h-4 w-4" />
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
        onClick={() => setDeleteOpen(true)}
        aria-label="Hapus transaksi BBM"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {receiptUrl && (
        <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
          <DialogContent className="max-w-3xl border-border bg-card">
            <DialogHeader>
              <DialogTitle>Nota Pembelian BBM</DialogTitle>
              <DialogDescription>Pratinjau nota transaksi pembelian BBM.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receiptUrl}
                  alt={`Nota ${transaction.description}`}
                  className="max-h-[70vh] w-full rounded-md object-contain"
                  loading="lazy"
                />
              </div>
              <div className="flex justify-end">
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Buka di tab baru
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle>
              {isIncome ? "Ubah Pemasukan BBM" : "Ubah Pembelian BBM"}
            </DialogTitle>
            <DialogDescription>
              Pastikan data transaksi BBM yang diperbarui sudah benar.
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
                  <Label className="text-foreground">Sumber Dana</Label>
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
                  disabled={isSaving}
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
              onSubmit={purchaseForm.handleSubmit(handlePurchaseSubmit)}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Tanggal</Label>
                  <Input
                    type="date"
                    value={getDateInputValue(purchaseForm.watch("date"))}
                    onChange={(event) =>
                      purchaseForm.setValue("date", new Date(event.target.value))
                    }
                    className="border-border bg-muted/60 text-foreground"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Kendaraan</Label>
                  <Controller
                    control={purchaseForm.control}
                    name="carId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="border-border bg-muted/60 text-foreground">
                          <SelectValue placeholder="Pilih kendaraan" />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-card">
                          {cars.length === 0 && (
                            <SelectItem value="no-car" disabled>
                              Belum ada kendaraan
                            </SelectItem>
                          )}
                          {cars.map((car) => (
                            <SelectItem key={car.id} value={car.id}>
                              {car.name}
                              {car.licensePlate ? ` - ${car.licensePlate}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Total Biaya (Rp)</Label>
                <Controller
                  control={purchaseForm.control}
                  name="totalAmount"
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
                <Label className="text-foreground">Nota/Struk</Label>
                {receiptUrl && (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-sm text-blue-400 hover:text-blue-300"
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
                  {receiptFile ? receiptFile.name : "Unggah nota baru (opsional)"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Catatan</Label>
                <Textarea
                  {...purchaseForm.register("notes")}
                  className="border-border bg-muted/60 text-foreground"
                  disabled={isSaving}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={isSaving}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500"
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
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Hapus Transaksi BBM</DialogTitle>
            <DialogDescription>
              {isIncome
                ? "Pemasukan BBM akan dihapus permanen."
                : "Pembelian BBM dan nota terkait akan dihapus permanen."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
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
