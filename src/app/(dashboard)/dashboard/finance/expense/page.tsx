"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NominalInput } from "@/components/inputs/nominal-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import {
  createExpenseSchema,
  type CreateExpenseInput,
} from "@/features/finance/schemas/transaction.schema";
import { createExpense } from "@/features/finance/actions";
import { getCars } from "@/features/cars/actions";
import { formatRupiah } from "@/lib/utils";

type CarOption = {
  id: string;
  name: string;
  licensePlate: string | null;
};

type ItemDraft = {
  description: string;
  quantity: number;
  unitPrice: number;
  carId: string;
};

const emptyItemDraft: ItemDraft = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  carId: "none",
};

export default function ExpensePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(emptyItemDraft);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemDescriptionRef = useRef<HTMLInputElement>(null);

  const form = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      date: new Date(),
      description: "",
      notes: "",
      items: [],
    },
  });

  useEffect(() => {
    let mounted = true;

    getCars()
      .then((data) => {
        if (mounted) {
          setCars(data);
        }
      })
      .catch(() => {
        toast.error("Gagal memuat daftar armada");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  const totalAmount = watchItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0
  );

  async function onSubmit(data: CreateExpenseInput) {
    if (!receiptFile) {
      toast.error("Nota/struk wajib diupload");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createExpense(data, receiptFile);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Pengeluaran berhasil disimpan");
        router.push("/dashboard/finance");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleAddItem() {
    const description = itemDraft.description.trim();

    if (!description) {
      toast.error("Nama item wajib diisi");
      return;
    }

    if (!Number.isInteger(itemDraft.quantity) || itemDraft.quantity <= 0) {
      toast.error("Qty harus lebih dari 0");
      return;
    }

    if (!Number.isInteger(itemDraft.unitPrice) || itemDraft.unitPrice <= 0) {
      toast.error("Harga harus lebih dari 0");
      return;
    }

    if (itemDraft.carId === "none") {
      toast.error("Armada wajib dipilih");
      return;
    }

    append({
      description,
      quantity: itemDraft.quantity,
      unitPrice: itemDraft.unitPrice,
      carId: itemDraft.carId,
    });
    form.clearErrors("items");
    setItemDraft(emptyItemDraft);
    requestAnimationFrame(() => itemDescriptionRef.current?.focus());
  }

  function getCarLabel(carId: string | null | undefined) {
    if (!carId) return "Tanpa armada";

    const car = cars.find((item) => item.id === carId);
    if (!car) return "Armada tidak ditemukan";

    return `${car.name}${car.licensePlate ? ` - ${car.licensePlate}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/finance">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Input Pengeluaran
          </h1>
          <p className="text-muted-foreground">Tambah pengeluaran baru</p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Detail Pengeluaran</CardTitle>
          <CardDescription className="text-muted-foreground">
            Masukkan informasi pengeluaran
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Tanggal</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={
                            field.value instanceof Date
                              ? field.value.toISOString().split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            field.onChange(new Date(e.target.value))
                          }
                          disabled={isLoading}
                          className="border-border bg-muted/60 text-foreground"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">
                        Keterangan
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Contoh: Pembelian Sparepart"
                          disabled={isLoading}
                          className="border-border bg-muted/60 text-foreground"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Receipt Upload */}
              <div className="space-y-2">
                <FormLabel className="text-foreground">Nota/Struk *</FormLabel>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {receiptPreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="max-h-48 rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 border-border"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Ganti Nota
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-border py-8 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Nota/Struk
                  </Button>
                )}
              </div>

              <Separator className="bg-muted" />

              {/* Items */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground">Input Item</h3>
                  <p className="text-sm text-muted-foreground">
                    Isi detail item, lalu klik Tambah Item untuk memasukkannya
                    ke daftar pengeluaran.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="grid gap-3 md:grid-cols-7">
                    <div className="space-y-2 md:col-span-2">
                      <FormLabel className="text-sm text-muted-foreground">
                        Deskripsi
                      </FormLabel>
                      <Input
                        ref={itemDescriptionRef}
                        value={itemDraft.description}
                        onChange={(event) =>
                          setItemDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Nama item"
                        disabled={isLoading}
                        className="border-border bg-muted/60 text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <FormLabel className="text-sm text-muted-foreground">
                        Qty
                      </FormLabel>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={itemDraft.quantity}
                        onChange={(event) =>
                          setItemDraft((current) => ({
                            ...current,
                            quantity: Number(event.target.value),
                          }))
                        }
                        disabled={isLoading}
                        className="border-border bg-muted/60 text-foreground"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <FormLabel className="text-sm text-muted-foreground">
                        Armada *
                      </FormLabel>
                      <Select
                        value={itemDraft.carId}
                        onValueChange={(value) =>
                          setItemDraft((current) => ({
                            ...current,
                            carId: value,
                          }))
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="border-border bg-muted/60 text-foreground">
                          <SelectValue placeholder="Pilih armada" />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-card">
                          <SelectItem value="none">Pilih armada</SelectItem>
                          {cars.length === 0 && (
                            <SelectItem value="no-car" disabled>
                              Belum ada armada
                            </SelectItem>
                          )}
                          {cars.map((car) => (
                            <SelectItem key={car.id} value={car.id}>
                              {car.name}
                              {car.licensePlate
                                ? ` - ${car.licensePlate}`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <FormLabel className="text-sm text-muted-foreground">
                        Harga
                      </FormLabel>
                      <div className="flex gap-2">
                        <NominalInput
                          value={itemDraft.unitPrice}
                          onValueChange={(values) =>
                            setItemDraft((current) => ({
                              ...current,
                              unitPrice: values.floatValue ?? 0,
                            }))
                          }
                          disabled={isLoading}
                          className="border-border bg-muted/60 text-foreground"
                        />
                        <Button
                          type="button"
                          onClick={handleAddItem}
                          disabled={isLoading}
                          className="shrink-0"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Tambah
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">
                      Daftar Item
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {fields.length} item
                    </span>
                  </div>

                  {fields.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                      Belum ada item. Isi form item di atas lalu klik Tambah.
                    </div>
                  ) : (
                    fields.map((field, index) => {
                      const item = watchItems[index];
                      const subtotal =
                        (item?.quantity || 0) * (item?.unitPrice || 0);

                      return (
                        <div
                          key={field.id}
                          className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {item?.description}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item?.quantity} x{" "}
                              {formatRupiah(item?.unitPrice || 0)} ·{" "}
                              {getCarLabel(item?.carId)}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-3 md:justify-end">
                            <span className="font-semibold text-red-400">
                              {formatRupiah(subtotal)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              disabled={isLoading}
                              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {form.formState.errors.items?.message && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.items.message}
                    </p>
                  )}
                </div>
              </div>

              <Separator className="bg-muted" />

              {/* Total */}
              <div className="flex items-center justify-between rounded-lg bg-muted/60 p-4">
                <span className="font-medium text-foreground">Total</span>
                <span className="text-xl font-bold text-red-400">
                  {formatRupiah(totalAmount)}
                </span>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">
                      Catatan (Opsional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Catatan tambahan"
                        disabled={isLoading}
                        className="border-border bg-muted/60 text-foreground"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-500"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Pengeluaran"
                  )}
                </Button>
                <Link href="/dashboard/finance">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    className="border-border"
                  >
                    Batal
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
