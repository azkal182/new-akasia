'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { receiveFuelIncome } from '@/features/fuel/actions';
import { formatRupiah } from '@/lib/utils';

const incomeSchema = z.object({
  amount: z.coerce.number().int().positive('Jumlah wajib diisi'),
  source: z.string().min(1, 'Sumber wajib diisi'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  notes: z.string().optional(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

export default function FuelIncomePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      amount: 0,
      source: 'Yayasan',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const watchAmount = form.watch('amount');

  async function onSubmit(data: IncomeFormData) {
    setIsSubmitting(true);
    try {
      const result = await receiveFuelIncome({
        amount: data.amount,
        source: data.source,
        date: new Date(data.date),
        notes: data.notes,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pemasukan BBM berhasil dicatat');
        router.push('/dashboard/fuel');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/fuel">
          <Button variant="ghost" size="icon" className="text-neutral-400">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Pemasukan BBM</h1>
          <p className="text-neutral-400">Catat dana BBM yang diterima</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-neutral-800 bg-neutral-900/50 max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            Data Pemasukan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-neutral-300">
                Jumlah (Rp)
              </Label>
              <Input
                id="amount"
                type="number"
                {...form.register('amount', { valueAsNumber: true })}
                placeholder="1000000"
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-400">{form.formState.errors.amount.message}</p>
              )}
              {watchAmount > 0 && (
                <p className="text-sm text-emerald-400">{formatRupiah(watchAmount)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="source" className="text-neutral-300">
                Sumber Dana
              </Label>
              <Input
                id="source"
                {...form.register('source')}
                placeholder="Yayasan, Operasional, dll"
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
              {form.formState.errors.source && (
                <p className="text-sm text-red-400">{form.formState.errors.source.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-neutral-300">
                Tanggal
              </Label>
              <Input
                id="date"
                type="date"
                {...form.register('date')}
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
              {form.formState.errors.date && (
                <p className="text-sm text-red-400">{form.formState.errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-neutral-300">
                Catatan (Opsional)
              </Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Tambahkan catatan..."
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Link href="/dashboard/fuel">
                <Button type="button" variant="outline" className="border-neutral-700">
                  Batal
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
