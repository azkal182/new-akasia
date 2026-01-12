"use client";

import { useState, useRef } from "react";
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
import { Separator } from "@/components/ui/separator";

import {
  createExpenseSchema,
  type CreateExpenseInput,
} from "@/features/finance/schemas/transaction.schema";
import { createExpense } from "@/features/finance/actions";
import { formatRupiah } from "@/lib/utils";

export default function ExpensePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      date: new Date(),
      description: "",
      notes: "",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

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
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">Daftar Item</h3>
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
                    className="grid gap-3 rounded-lg bg-muted/40 p-4 md:grid-cols-4"
                  >
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-muted-foreground text-sm">
                            Deskripsi
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Nama item"
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
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-sm">
                            Qty
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                              disabled={isLoading}
                              className="border-border bg-muted/60 text-foreground"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-end gap-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-muted-foreground text-sm">
                              Harga
                            </FormLabel>
                            <FormControl>
                              <NominalInput
                                value={field.value ?? 0}
                                onValueChange={(values) =>
                                  field.onChange(values.floatValue ?? 0)
                                }
                                name={field.name}
                                onBlur={field.onBlur}
                                disabled={isLoading}
                                className="border-border bg-muted/60 text-foreground"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
