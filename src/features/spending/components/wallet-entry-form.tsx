'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { WalletEntryType } from '@/generated/prisma/enums';
import { NominalInput } from '@/components/inputs/nominal-input';
import { createWalletEntrySchema, type CreateWalletEntryInput } from '../schemas';
import { createWalletEntry } from '../actions';

export function WalletEntryForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CreateWalletEntryInput>({
    resolver: zodResolver(createWalletEntrySchema),
    defaultValues: {
      type: WalletEntryType.CREDIT,
      amount: 0,
      description: '',
      occurredAt: new Date(),
    },
  });

  async function onSubmit(data: CreateWalletEntryInput) {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        occurredAt: data.occurredAt ?? new Date(),
      };
      const result = await createWalletEntry(payload);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Catatan dompet tersimpan');
        form.reset({
          type: WalletEntryType.CREDIT,
          amount: 0,
          description: '',
          occurredAt: new Date(),
        });
      }
    } catch {
      toast.error('Gagal menyimpan catatan');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Tipe</Label>
          <Select
            value={form.watch('type')}
            onValueChange={(value) => form.setValue('type', value as WalletEntryType)}
          >
            <SelectTrigger className="border-border bg-muted/60 text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              <SelectItem value={WalletEntryType.CREDIT}>Kredit</SelectItem>
              <SelectItem value={WalletEntryType.DEBIT}>Debit</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
              />
            )}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Tanggal</Label>
          <Input
            type="date"
            value={form.watch('occurredAt') instanceof Date ? form.watch('occurredAt')?.toISOString().split('T')[0] : ''}
            onChange={(event) => form.setValue('occurredAt', new Date(event.target.value))}
            className="border-border bg-muted/60 text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Deskripsi</Label>
          <Textarea
            {...form.register('description')}
            className="border-border bg-muted/60 text-foreground"
          />
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500">
        {isSubmitting ? 'Menyimpan...' : 'Tambah Catatan'}
      </Button>
    </form>
  );
}
