'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Car } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createCar } from '@/features/cars/actions';

const carSchema = z.object({
  name: z.string().min(1, 'Nama mobil wajib diisi'),
  licensePlate: z.string().min(1, 'Plat nomor wajib diisi'),
  barcodeString: z.string().optional(),
});

type CarFormData = z.infer<typeof carSchema>;

export default function NewCarPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CarFormData>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      name: '',
      licensePlate: '',
      barcodeString: '',
    },
  });

  async function onSubmit(data: CarFormData) {
    setIsSubmitting(true);
    try {
      const result = await createCar(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Mobil berhasil ditambahkan');
        router.push('/dashboard/cars');
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
        <Link href="/dashboard/cars">
          <Button variant="ghost" size="icon" className="text-neutral-400">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Tambah Mobil</h1>
          <p className="text-neutral-400">Daftarkan kendaraan baru</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-neutral-800 bg-neutral-900/50 max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Car className="h-5 w-5" />
            Data Kendaraan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-neutral-300">
                Nama Mobil
              </Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Toyota Avanza"
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-400">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="licensePlate" className="text-neutral-300">
                Plat Nomor
              </Label>
              <Input
                id="licensePlate"
                {...form.register('licensePlate')}
                placeholder="B 1234 ABC"
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
              {form.formState.errors.licensePlate && (
                <p className="text-sm text-red-400">{form.formState.errors.licensePlate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcodeString" className="text-neutral-300">
                Kode Barcode (Opsional)
              </Label>
              <Input
                id="barcodeString"
                {...form.register('barcodeString')}
                placeholder="CAR-001"
                className="border-neutral-700 bg-neutral-800/50 text-white"
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
              <Link href="/dashboard/cars">
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
