"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCashbackSchema, type CreateCashbackInput } from "../schemas";
import { createCashback } from "../actions";
import { NominalInput } from "@/components/inputs/nominal-input";

interface CashbackFormProps {
  receiptId: string;
  isLocked: boolean;
}

export function CashbackForm({ receiptId, isLocked }: CashbackFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateCashbackInput>({
    resolver: zodResolver(createCashbackSchema),
    defaultValues: {
      amount: 0,
      vendor: "",
      notes: "",
      occurredAt: new Date(),
    },
  });

  async function onSubmit(data: CreateCashbackInput) {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        occurredAt: data.occurredAt ?? new Date(),
      };
      const result = await createCashback(receiptId, payload);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Pengembalian tersimpan");
        form.reset({
          amount: 0,
          vendor: "",
          notes: "",
          occurredAt: new Date(),
        });
      }
    } catch {
      toast.error("Gagal menyimpan pengembalian");
    } finally {
      setIsSubmitting(false);
    }
  }

  function onInvalid() {
    toast.error("Mohon isi jumlah pengembalian");
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      className="space-y-3"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Jumlah</Label>
          <Controller
            control={form.control}
            name="amount"
            render={({ field }) => (
              <NominalInput
                value={field.value ?? 0}
                onValueChange={(values) => field.onChange(values.floatValue ?? 0)}
                name={field.name}
                onBlur={field.onBlur}
                className="border-border bg-muted/60 text-foreground"
                disabled={isLocked}
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Tanggal</Label>
          <Input
            type="date"
            value={
              form.watch("occurredAt") instanceof Date
                ? form.watch("occurredAt")?.toISOString().split("T")[0]
                : ""
            }
            onChange={(event) =>
              form.setValue(
                "occurredAt",
                event.target.value ? new Date(event.target.value) : undefined
              )
            }
            className="border-border bg-muted/60 text-foreground"
            disabled={isLocked}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Toko</Label>
          <Input
            {...form.register("vendor")}
            className="border-border bg-muted/60 text-foreground"
            disabled={isLocked}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Catatan</Label>
          <Textarea
            {...form.register("notes")}
            className="border-border bg-muted/60 text-foreground"
            disabled={isLocked}
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={isSubmitting || isLocked}
        className="bg-emerald-600 hover:bg-emerald-500"
      >
        {isSubmitting ? "Menyimpan..." : "Tambah Cashback"}
      </Button>
    </form>
  );
}
