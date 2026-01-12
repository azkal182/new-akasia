'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Car, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getCarById, updateCar } from '@/features/cars/actions';

const carSchema = z.object({
  name: z.string().min(1, 'Nama mobil wajib diisi'),
  licensePlate: z.string().min(1, 'Plat nomor wajib diisi'),
  barcodeString: z.string().optional(),
});

type CarFormData = z.infer<typeof carSchema>;

interface EditCarPageProps {
  params: Promise<{ id: string }>;
}

export default function EditCarPage({ params }: EditCarPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [carId, setCarId] = useState<string>('');

  const form = useForm<CarFormData>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      name: '',
      licensePlate: '',
      barcodeString: '',
    },
  });

  useEffect(() => {
    async function loadCar() {
      const { id } = await params;
      setCarId(id);

      const car = await getCarById(id);
      if (!car) {
        toast.error('Mobil tidak ditemukan');
        router.push('/dashboard/cars');
        return;
      }

      form.reset({
        name: car.name,
        licensePlate: car.licensePlate || '',
        barcodeString: car.barcodeString || '',
      });
      setIsLoading(false);
    }
    loadCar();
  }, [params, router, form]);

  async function onSubmit(data: CarFormData) {
    setIsSubmitting(true);
    try {
      const result = await updateCar(carId, data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Mobil berhasil diupdate');
        router.push(`/dashboard/cars/${carId}`);
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
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
        <Link href={`/dashboard/cars/${carId}`}>
          <Button variant="ghost" size="icon" className="text-neutral-400">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Mobil</h1>
          <p className="text-neutral-400">Ubah data kendaraan</p>
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
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
              <Link href={`/dashboard/cars/${carId}`}>
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
