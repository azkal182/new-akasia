'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createPerizinan } from '@/features/perizinan/actions';
import { getCars } from '@/features/cars/actions';
import { formatRupiah } from '@/lib/utils';

const perizinanSchema = z.object({
  carId: z.string().uuid('Pilih kendaraan'),
  name: z.string().min(1, 'Nama pemohon wajib diisi'),
  purpose: z.string().min(1, 'Tujuan wajib diisi'),
  destination: z.string().min(1, 'Tempat tujuan wajib diisi'),
  description: z.string().optional(),
  numberOfPassengers: z.coerce.number().int().positive('Jumlah penumpang wajib diisi'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  estimation: z.coerce.number().int().positive('Estimasi biaya wajib diisi'),
});

type PerizinanFormData = z.infer<typeof perizinanSchema>;
type Car = { id: string; name: string; licensePlate: string | null };

export default function NewPerizinanPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);

  useEffect(() => {
    getCars().then((data) => setCars(data));
  }, []);

  const form = useForm<PerizinanFormData>({
    resolver: zodResolver(perizinanSchema),
    defaultValues: {
      carId: '',
      name: '',
      purpose: '',
      destination: '',
      description: '',
      numberOfPassengers: 1,
      date: '',
      estimation: 0,
    },
  });

  const estimation = form.watch('estimation');

  async function onSubmit(data: PerizinanFormData) {
    setIsSubmitting(true);
    try {
      const result = await createPerizinan({
        ...data,
        date: new Date(data.date),
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Perizinan berhasil dibuat');
        router.push('/dashboard/perizinan');
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
        <Link href="/dashboard/perizinan">
          <Button variant="ghost" size="icon" className="text-neutral-400">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Buat Perizinan</h1>
          <p className="text-neutral-400">Ajukan izin penggunaan kendaraan</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5" />
            Data Perizinan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-neutral-300">
                  Nama Pemohon
                </Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Nama lengkap"
                  className="border-neutral-700 bg-neutral-800/50 text-white"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-400">{form.formState.errors.name.message}</p>
                )}
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="purpose" className="text-neutral-300">
                  Tujuan Penggunaan
                </Label>
                <Input
                  id="purpose"
                  {...form.register('purpose')}
                  placeholder="Antar jemput, dinas, dll"
                  className="border-neutral-700 bg-neutral-800/50 text-white"
                />
                {form.formState.errors.purpose && (
                  <p className="text-sm text-red-400">{form.formState.errors.purpose.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination" className="text-neutral-300">
                  Tempat Tujuan
                </Label>
                <Input
                  id="destination"
                  {...form.register('destination')}
                  placeholder="Jakarta, Bandung, dll"
                  className="border-neutral-700 bg-neutral-800/50 text-white"
                />
                {form.formState.errors.destination && (
                  <p className="text-sm text-red-400">{form.formState.errors.destination.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-neutral-300">
                  Tanggal Penggunaan
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
                <Label htmlFor="numberOfPassengers" className="text-neutral-300">
                  Jumlah Penumpang
                </Label>
                <Input
                  id="numberOfPassengers"
                  type="number"
                  {...form.register('numberOfPassengers', { valueAsNumber: true })}
                  placeholder="1"
                  className="border-neutral-700 bg-neutral-800/50 text-white"
                />
                {form.formState.errors.numberOfPassengers && (
                  <p className="text-sm text-red-400">{form.formState.errors.numberOfPassengers.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimation" className="text-neutral-300">
                  Estimasi Biaya (Rp)
                </Label>
                <Input
                  id="estimation"
                  type="number"
                  {...form.register('estimation', { valueAsNumber: true })}
                  placeholder="100000"
                  className="border-neutral-700 bg-neutral-800/50 text-white"
                />
                {form.formState.errors.estimation && (
                  <p className="text-sm text-red-400">{form.formState.errors.estimation.message}</p>
                )}
                {estimation > 0 && (
                  <p className="text-sm text-neutral-500">{formatRupiah(estimation)}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-neutral-300">
                Keterangan (Opsional)
              </Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Tambahkan keterangan..."
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {isSubmitting ? 'Menyimpan...' : 'Ajukan Perizinan'}
              </Button>
              <Link href="/dashboard/perizinan">
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
