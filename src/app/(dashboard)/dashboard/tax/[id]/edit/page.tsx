'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getTaxById, updateTax, deleteTax } from '@/features/tax/actions';

const taxSchema = z.object({
  type: z.enum(['ANNUAL', 'FIVE_YEAR']),
  dueDate: z.string().min(1, 'Tanggal jatuh tempo wajib diisi'),
  notes: z.string().optional().nullable(),
});

type TaxFormData = z.infer<typeof taxSchema>;

interface EditTaxPageProps {
  params: Promise<{ id: string }>;
}

export default function EditTaxPage({ params }: EditTaxPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [taxId, setTaxId] = useState<string>('');
  const [carName, setCarName] = useState<string>('');

  const form = useForm<TaxFormData>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      type: 'ANNUAL',
      dueDate: '',
      notes: '',
    },
  });

  useEffect(() => {
    async function loadTax() {
      const { id } = await params;
      setTaxId(id);

      const tax = await getTaxById(id);
      if (!tax) {
        toast.error('Pajak tidak ditemukan');
        router.push('/dashboard/tax');
        return;
      }

      setCarName(`${tax.car.name} - ${tax.car.licensePlate}`);
      form.reset({
        type: tax.type as 'ANNUAL' | 'FIVE_YEAR',
        dueDate: tax.dueDate.toISOString().split('T')[0],
        notes: tax.notes || '',
      });
      setIsLoading(false);
    }
    loadTax();
  }, [params, router, form]);

  async function onSubmit(data: TaxFormData) {
    setIsSubmitting(true);
    try {
      const result = await updateTax(taxId, {
        type: data.type as 'ANNUAL' | 'FIVE_YEAR',
        dueDate: new Date(data.dueDate),
        notes: data.notes,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pajak berhasil diupdate');
        router.push('/dashboard/tax');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Yakin ingin menghapus pajak ini?')) return;

    setIsDeleting(true);
    try {
      const result = await deleteTax(taxId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pajak berhasil dihapus');
        router.push('/dashboard/tax');
      }
    } catch {
      toast.error('Gagal menghapus pajak');
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tax">
          <Button variant="ghost" size="icon" className="text-neutral-400">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Pajak</h1>
          <p className="text-neutral-400">{carName}</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-neutral-800 bg-neutral-900/50 max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5" />
            Data Pajak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Jenis Pajak</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(v) => form.setValue('type', v as 'ANNUAL' | 'FIVE_YEAR')}
              >
                <SelectTrigger className="border-neutral-700 bg-neutral-800/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-neutral-700 bg-neutral-900">
                  <SelectItem value="ANNUAL">Pajak Tahunan</SelectItem>
                  <SelectItem value="FIVE_YEAR">STNK 5 Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-neutral-300">
                Tanggal Jatuh Tempo
              </Label>
              <Input
                id="dueDate"
                type="date"
                {...form.register('dueDate')}
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
              {form.formState.errors.dueDate && (
                <p className="text-sm text-red-400">{form.formState.errors.dueDate.message}</p>
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

            <div className="flex justify-between pt-4">
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
                <Link href="/dashboard/tax">
                  <Button type="button" variant="outline" className="border-neutral-700">
                    Batal
                  </Button>
                </Link>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
