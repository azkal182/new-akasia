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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { createTax } from '@/features/tax/actions';
import { getCars } from '@/features/cars/actions';

const taxSchema = z.object({
  carId: z.string().uuid('Pilih kendaraan'),
  type: z.literal('FIVE_YEAR'),
  dueDate: z.string().min(1, 'Tanggal jatuh tempo wajib diisi'),
  notes: z.string().optional(),
  generateCycle: z.boolean().optional(),
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
      type: 'FIVE_YEAR',
      dueDate: '',
      notes: '',
      generateCycle: true,
    },
  });

  async function onSubmit(data: TaxFormData) {
    setIsSubmitting(true);
    try {
      const result = await createTax({
        carId: data.carId,
        type: 'FIVE_YEAR',
        dueDate: new Date(data.dueDate),
        notes: data.notes,
        generateCycle: data.generateCycle,
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
            <Alert className="bg-blue-50/50 border-blue-200 text-blue-800">
              <FileText className="h-4 w-4 stroke-blue-600" />
              <AlertTitle>Informasi Pendataan Pajak</AlertTitle>
              <AlertDescription className="text-blue-700/90 text-sm">
                Formulir ini khusus untuk mendata tanggal acuan <strong>Pajak 5 Tahunan (STNK / Ganti Plat)</strong>. Pajak tahunan di antaranya akan dibuatkan atau otomatis ter-<em>generate</em> ketika Anda melakukan pembayaran.
              </AlertDescription>
            </Alert>

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
              <Label htmlFor="dueDate" className="text-foreground">
                Tanggal Jatuh Tempo STNK 5 Tahunan
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

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="generateCycle"
                {...form.register('generateCycle')}
                className="rounded border-border text-blue-600 focus:ring-blue-500"
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor="generateCycle" className="text-foreground font-medium">
                  Generate Pajak Tahunan Sebelumnya (Backfill)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Akan otomatis mengisi riwayat pajak Tahunan (ANNUAL) ke belakang dari tanggal STNK 5 Tahunan hingga tahun saat ini.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
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
