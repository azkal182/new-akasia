'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createTax } from '@/features/tax/actions';
import { getCars } from '@/features/cars/actions';

const taxSchema = z.object({
  carId: z.string().uuid('Pilih kendaraan'),
  type: z.enum(['ANNUAL', 'FIVE_YEAR']),
  dueDate: z.string().min(1, 'Tanggal jatuh tempo wajib diisi'),
  notes: z.string().optional(),
});

type TaxFormData = z.infer<typeof taxSchema>;

type Car = { id: string; name: string; licensePlate: string | null };

export default function NewTaxPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);

  useEffect(() => {
    getCars().then((data) => setCars(data));
  }, []);

  const form = useForm<TaxFormData>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      carId: '',
      type: 'ANNUAL',
      dueDate: '',
      notes: '',
    },
  });

  async function onSubmit(data: TaxFormData) {
    setIsSubmitting(true);
    try {
      const result = await createTax({
        carId: data.carId,
        type: data.type as 'ANNUAL' | 'FIVE_YEAR',
        dueDate: new Date(data.dueDate),
        notes: data.notes,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pajak berhasil ditambahkan');
        router.push('/dashboard/tax');
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
        <Link href="/dashboard/tax">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tambah Pajak</h1>
          <p className="text-muted-foreground">Catat pajak kendaraan baru</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-border bg-card/60 max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5" />
            Data Pajak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Kendaraan</Label>
              <Select onValueChange={(v) => form.setValue('carId', v)}>
                <SelectTrigger className="border-border bg-muted/60 text-foreground">
                  <SelectValue placeholder="Pilih kendaraan" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {cars.map((car) => (
                    <SelectItem key={car.id} value={car.id}>
                      {car.name} - {car.licensePlate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.carId && (
                <p className="text-sm text-red-400">{form.formState.errors.carId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Jenis Pajak</Label>
              <Select defaultValue="ANNUAL" onValueChange={(v) => form.setValue('type', v as 'ANNUAL' | 'FIVE_YEAR')}>
                <SelectTrigger className="border-border bg-muted/60 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="ANNUAL">Pajak Tahunan</SelectItem>
                  <SelectItem value="FIVE_YEAR">STNK 5 Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-foreground">
                Tanggal Jatuh Tempo
              </Label>
              <Input
                id="dueDate"
                type="date"
                {...form.register('dueDate')}
                className="border-border bg-muted/60 text-foreground"
              />
              {form.formState.errors.dueDate && (
                <p className="text-sm text-red-400">{form.formState.errors.dueDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">
                Catatan (Opsional)
              </Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Tambahkan catatan..."
                className="border-border bg-muted/60 text-foreground"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Link href="/dashboard/tax">
                <Button type="button" variant="outline" className="border-border">
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
