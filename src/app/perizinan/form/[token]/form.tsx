'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { submitPublicPerizinan } from '@/features/perizinan/actions';

const formSchema = z.object({
  carId: z.string().uuid('Pilih kendaraan'),
  name: z.string().min(1, 'Nama pemohon wajib diisi'),
  purpose: z.string().min(1, 'Keperluan wajib diisi'),
  destination: z.string().min(1, 'Tujuan wajib diisi'),
  description: z.string().optional(),
  numberOfPassengers: z.coerce.number().int().positive('Jumlah penumpang wajib diisi'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  estimation: z.coerce.number().int().positive('Estimasi durasi wajib diisi'),
});

type FormData = z.infer<typeof formSchema>;

interface Car {
  id: string;
  name: string;
  licensePlate: string | null;
}

interface PublicPerizinanFormProps {
  token: string;
  cars: Car[];
}

export default function PublicPerizinanForm({ token, cars }: PublicPerizinanFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      carId: '',
      name: '',
      purpose: '',
      destination: '',
      description: '',
      numberOfPassengers: 1,
      date: '',
      estimation: 1,
    },
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const result = await submitPublicPerizinan(token, {
        ...data,
        date: new Date(data.date),
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setIsSuccess(true);
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/10">
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Pengajuan Berhasil!</h2>
          <p className="text-neutral-300">
            Permohonan izin Anda telah dikirim dan menunggu persetujuan.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-neutral-800 bg-neutral-900/50">
      <CardHeader>
        <CardTitle className="text-white">Data Permohonan</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-neutral-300">Nama Pemohon</Label>
            <Input
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Keperluan</Label>
              <Input
                {...form.register('purpose')}
                placeholder="Tujuan penggunaan"
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
              {form.formState.errors.purpose && (
                <p className="text-sm text-red-400">{form.formState.errors.purpose.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">Tujuan</Label>
              <Input
                {...form.register('destination')}
                placeholder="Tempat tujuan"
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
              {form.formState.errors.destination && (
                <p className="text-sm text-red-400">{form.formState.errors.destination.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Tanggal Penggunaan</Label>
              <Input
                type="date"
                {...form.register('date')}
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
              {form.formState.errors.date && (
                <p className="text-sm text-red-400">{form.formState.errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">Jumlah Penumpang</Label>
              <Input
                type="number"
                min="1"
                {...form.register('numberOfPassengers')}
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">Estimasi (hari)</Label>
              <Input
                type="number"
                min="1"
                {...form.register('estimation')}
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Keterangan (Opsional)</Label>
            <Textarea
              {...form.register('description')}
              placeholder="Tambahkan keterangan..."
              className="border-neutral-700 bg-neutral-800/50 text-white"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500"
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim Permohonan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
