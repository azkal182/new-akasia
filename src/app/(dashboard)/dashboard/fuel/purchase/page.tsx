'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Fuel } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { purchaseFuel } from '@/features/fuel/actions';
import { getCars } from '@/features/cars/actions';
import { formatRupiah } from '@/lib/utils';

const fuelSchema = z.object({
  carId: z.string().uuid('Pilih kendaraan'),
  literAmount: z.coerce.number().positive('Jumlah liter wajib diisi'),
  pricePerLiter: z.coerce.number().int().positive('Harga per liter wajib diisi'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  notes: z.string().optional(),
});

type FuelFormData = z.infer<typeof fuelSchema>;
type Car = { id: string; name: string; licensePlate: string | null };

export default function FuelPurchasePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);

  useEffect(() => {
    getCars().then((data) => setCars(data));
  }, []);

  const form = useForm<FuelFormData>({
    resolver: zodResolver(fuelSchema),
    defaultValues: {
      carId: '',
      literAmount: 0,
      pricePerLiter: 13000,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const watchLiter = form.watch('literAmount');
  const watchPrice = form.watch('pricePerLiter');
  const totalAmount = (watchLiter || 0) * (watchPrice || 0);

  async function onSubmit(data: FuelFormData) {
    setIsSubmitting(true);
    try {
      const result = await purchaseFuel({
        carId: data.carId,
        literAmount: data.literAmount,
        pricePerLiter: data.pricePerLiter,
        date: new Date(data.date),
        notes: data.notes,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pembelian BBM berhasil dicatat');
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
          <h1 className="text-2xl font-bold text-white">Isi BBM</h1>
          <p className="text-neutral-400">Catat pembelian bahan bakar</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-neutral-800 bg-neutral-900/50 max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Fuel className="h-5 w-5" />
            Data Pembelian BBM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Kendaraan</Label>
              <Select onValueChange={(v) => form.setValue('carId', v)}>
                <SelectTrigger className="border-neutral-700 bg-neutral-800/50 text-white">
                  <SelectValue placeholder="Pilih kendaraan" />
                </SelectTrigger>
                <SelectContent className="border-neutral-700 bg-neutral-900">
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="literAmount" className="text-neutral-300">
                  Jumlah Liter
                </Label>
                <Input
                  id="literAmount"
                  type="number"
                  step="0.01"
                  {...form.register('literAmount', { valueAsNumber: true })}
                  placeholder="20"
                  className="border-neutral-700 bg-neutral-800/50 text-white"
                />
                {form.formState.errors.literAmount && (
                  <p className="text-sm text-red-400">{form.formState.errors.literAmount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerLiter" className="text-neutral-300">
                  Harga per Liter (Rp)
                </Label>
                <Input
                  id="pricePerLiter"
                  type="number"
                  {...form.register('pricePerLiter', { valueAsNumber: true })}
                  placeholder="13000"
                  className="border-neutral-700 bg-neutral-800/50 text-white"
                />
                {form.formState.errors.pricePerLiter && (
                  <p className="text-sm text-red-400">{form.formState.errors.pricePerLiter.message}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-neutral-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Total</span>
                <span className="text-xl font-bold text-amber-400">{formatRupiah(totalAmount)}</span>
              </div>
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
                placeholder="SPBU, jenis BBM, dll"
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-500"
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
