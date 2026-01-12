'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createFundingSchema, type CreateFundingInput } from '../schemas';
import { createTaskFunding, updateTaskFunding } from '../actions';

interface FundingFormProps {
  taskId: string;
  funding?: {
    amount: number;
    receivedAt: Date;
    source: string;
    notes: string | null;
  } | null;
  isLocked: boolean;
}

export function FundingForm({ taskId, funding, isLocked }: FundingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateFundingInput>({
    resolver: zodResolver(createFundingSchema),
    defaultValues: {
      amount: funding?.amount ?? 0,
      receivedAt: funding?.receivedAt ?? new Date(),
      source: funding?.source ?? 'Yayasan',
      notes: funding?.notes ?? '',
    },
  });

  async function onSubmit(data: CreateFundingInput) {
    if (isLocked) {
      toast.error('Anggaran sudah dikunci');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        receivedAt: data.receivedAt ?? new Date(),
      };
      const result = funding
        ? await updateTaskFunding(taskId, payload)
        : await createTaskFunding(taskId, payload);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(funding ? 'Pendanaan diperbarui' : 'Pendanaan tersimpan');
      }
    } catch {
      toast.error('Gagal menyimpan pendanaan');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Jumlah</Label>
          <Input
            type="number"
            {...form.register('amount', { valueAsNumber: true })}
            className="border-border bg-muted/60 text-foreground"
            disabled={isLocked}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Tanggal Terima</Label>
          <Input
            type="date"
            value={form.watch('receivedAt') instanceof Date ? form.watch('receivedAt')?.toISOString().split('T')[0] : ''}
            onChange={(event) => form.setValue('receivedAt', new Date(event.target.value))}
            className="border-border bg-muted/60 text-foreground"
            disabled={isLocked}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Sumber</Label>
          <Input
            {...form.register('source')}
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
      <Button type="submit" disabled={isSubmitting || isLocked} className="bg-blue-600 hover:bg-blue-500">
        {isSubmitting ? 'Menyimpan...' : funding ? 'Perbarui Pendanaan' : 'Simpan Pendanaan'}
      </Button>
    </form>
  );
}
