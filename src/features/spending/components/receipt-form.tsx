'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createReceiptSchema, type CreateReceiptInput } from '../schemas';
import { createReceipt } from '../actions';
import { formatRupiah } from '@/lib/utils';

interface ReceiptFormProps {
  taskId: string;
  isLocked: boolean;
}

export function ReceiptForm({ taskId, isLocked }: ReceiptFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CreateReceiptInput>({
    resolver: zodResolver(createReceiptSchema),
    defaultValues: {
      vendor: '',
      receiptNo: '',
      receiptDate: undefined,
      notes: '',
      totalAmount: 0,
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const items = form.watch('items');
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0
  );

  useEffect(() => {
    form.setValue('totalAmount', totalAmount, { shouldValidate: true });
  }, [form, totalAmount]);

  function getFirstErrorMessage(errors: Record<string, unknown>): string | null {
    for (const value of Object.values(errors)) {
      if (!value) continue;
      if (typeof value === 'object' && value && 'message' in value) {
        const message = (value as { message?: string }).message;
        if (message) return message;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (!item) continue;
          if (typeof item === 'object') {
            const nested = getFirstErrorMessage(item as Record<string, unknown>);
            if (nested) return nested;
          }
        }
      }
      if (typeof value === 'object') {
        const nested = getFirstErrorMessage(value as Record<string, unknown>);
        if (nested) return nested;
      }
    }
    return null;
  }

  async function onSubmit(data: CreateReceiptInput) {
    if (isLocked) {
      toast.error('Anggaran sudah dikunci');
      return;
    }

    if (!files.length) {
      toast.error('Lampiran wajib diunggah');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateReceiptInput = {
        ...data,
        receiptDate: data.receiptDate ? new Date(data.receiptDate) : undefined,
        totalAmount,
      };
      const result = await createReceipt(taskId, payload, files);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Nota berhasil ditambahkan');
        form.reset({
          vendor: '',
          receiptNo: '',
          receiptDate: undefined,
          notes: '',
          totalAmount: 0,
          items: [{ description: '', quantity: 1, unitPrice: 0 }],
        });
        setFiles([]);
      }
    } catch {
      toast.error('Gagal menambahkan nota');
    } finally {
      setIsSubmitting(false);
    }
  }

  function onInvalid(errors: Record<string, unknown>) {
    const message = getFirstErrorMessage(errors) ?? 'Mohon lengkapi data nota';
    toast.error(message);
  }

  function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    setFiles(nextFiles);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Toko</Label>
          <Input
            {...form.register('vendor')}
            className="border-border bg-muted/60 text-foreground"
            disabled={isLocked}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">No Nota</Label>
          <Input
            {...form.register('receiptNo')}
            className="border-border bg-muted/60 text-foreground"
            disabled={isLocked}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Tanggal Nota</Label>
          <Input
            type="date"
            value={form.watch('receiptDate') instanceof Date ? form.watch('receiptDate')?.toISOString().split('T')[0] : ''}
            onChange={(event) =>
              form.setValue('receiptDate', event.target.value ? new Date(event.target.value) : undefined)
            }
            className="border-border bg-muted/60 text-foreground"
            disabled={isLocked}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Catatan</Label>
          <Textarea
            {...form.register('notes')}
            className="border-border bg-muted/60 text-foreground"
            disabled={isLocked}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Lampiran Nota</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesChange}
          className="hidden"
          disabled={isLocked}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLocked}
        >
          <Upload className="mr-2 h-4 w-4" />
          {files.length ? `${files.length} file dipilih` : 'Unggah Nota'}
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-foreground">Item</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
            className="border-border"
            disabled={isLocked}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Item
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-lg bg-muted/40 p-3 md:grid-cols-4">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Deskripsi</Label>
              <Input
                {...form.register(`items.${index}.description`)}
                className="border-border bg-muted/60 text-foreground"
                disabled={isLocked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Jumlah</Label>
              <Input
                type="number"
                {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                className="border-border bg-muted/60 text-foreground"
                disabled={isLocked}
              />
            </div>
            <div className="space-y-1 flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Harga</Label>
                <Input
                  type="number"
                  {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                  className="border-border bg-muted/60 text-foreground"
                  disabled={isLocked}
                />
              </div>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  disabled={isLocked}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-muted/60 p-3 text-right">
        <p className="text-sm text-muted-foreground">Total Nota</p>
        <p className="text-lg font-semibold text-foreground">{formatRupiah(totalAmount)}</p>
      </div>

      <Button type="submit" disabled={isSubmitting || isLocked} className="bg-blue-600 hover:bg-blue-500">
        {isSubmitting ? 'Menyimpan...' : 'Simpan Nota'}
      </Button>
    </form>
  );
}
