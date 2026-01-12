'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, FileCheck, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createPengajuan } from '@/features/pengajuan/actions';
import { getCars } from '@/features/cars/actions';
import { formatRupiah } from '@/lib/utils';
import { NominalInput } from '@/components/inputs/nominal-input';

const pengajuanSchema = z.object({
  notes: z.string().optional(),
  items: z.array(z.object({
    requirement: z.string().min(1, 'Kebutuhan wajib diisi'),
    estimation: z.coerce.number().int().positive('Estimasi wajib diisi'),
    carId: z.string().uuid('Pilih kendaraan'),
  })).min(1, 'Minimal satu item'),
});

type PengajuanFormData = z.infer<typeof pengajuanSchema>;
type Car = { id: string; name: string; licensePlate: string | null };

export default function NewPengajuanPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);

  useEffect(() => {
    getCars().then((data) => setCars(data));
  }, []);

  const form = useForm<PengajuanFormData>({
    resolver: zodResolver(pengajuanSchema),
    defaultValues: {
      notes: '',
      items: [{ requirement: '', estimation: 0, carId: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const totalEstimation = watchItems.reduce((sum, item) => sum + (item.estimation || 0), 0);

  async function onSubmit(data: PengajuanFormData) {
    setIsSubmitting(true);
    try {
      const result = await createPengajuan(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pengajuan berhasil dibuat');
        router.push('/dashboard/pengajuan');
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
        <Link href="/dashboard/pengajuan">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Buat Pengajuan</h1>
          <p className="text-muted-foreground">Ajukan pembelian atau perbaikan</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileCheck className="h-5 w-5" />
            Data Pengajuan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Item Pengajuan</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ requirement: '', estimation: 0, carId: '' })}
                  className="border-border"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border border-border bg-muted/40 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Item #{index + 1}</span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-foreground">Kebutuhan</Label>
                      <Input
                        {...form.register(`items.${index}.requirement`)}
                        placeholder="Ganti oli, servis, dll"
                        className="border-border bg-muted/60 text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Kendaraan</Label>
                      <Select onValueChange={(v) => form.setValue(`items.${index}.carId`, v)}>
                        <SelectTrigger className="border-border bg-muted/60 text-foreground">
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-card">
                          {cars.map((car) => (
                            <SelectItem key={car.id} value={car.id}>
                              {car.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Estimasi (Rp)</Label>
                      <Controller
                        control={form.control}
                        name={`items.${index}.estimation`}
                        render={({ field }) => (
                          <NominalInput
                            value={field.value ?? 0}
                            onValueChange={(values) => field.onChange(values.floatValue ?? 0)}
                            name={field.name}
                            onBlur={field.onBlur}
                            placeholder="0"
                            className="border-border bg-muted/60 text-foreground"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded-lg bg-muted/60 p-4 text-right">
                <span className="text-muted-foreground">Total Estimasi: </span>
                <span className="text-xl font-bold text-foreground">{formatRupiah(totalEstimation)}</span>
              </div>
            </div>

            {/* Notes */}
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
                {isSubmitting ? 'Menyimpan...' : 'Ajukan'}
              </Button>
              <Link href="/dashboard/pengajuan">
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
