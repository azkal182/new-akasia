'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Fuel, Upload } from 'lucide-react';
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
  totalAmount: z.coerce.number().int().positive('Total wajib diisi'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  notes: z.string().optional(),
});

type FuelFormData = z.infer<typeof fuelSchema>;
type Car = { id: string; name: string; licensePlate: string | null };

export default function FuelPurchasePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCars().then((data) => setCars(data));
  }, []);

  const form = useForm<FuelFormData>({
    resolver: zodResolver(fuelSchema),
    defaultValues: {
      carId: '',
      totalAmount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const watchTotal = form.watch('totalAmount');

  async function onSubmit(data: FuelFormData) {
    if (!receiptFile) {
      toast.error('Nota/struk wajib diupload');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await purchaseFuel({
        carId: data.carId,
        totalAmount: data.totalAmount,
        date: new Date(data.date),
        notes: data.notes,
      }, receiptFile);
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

  function handleReceiptChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/fuel">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Isi BBM</h1>
          <p className="text-muted-foreground">Catat pembelian bahan bakar</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-border bg-card/60 max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Fuel className="h-5 w-5" />
            Data Pembelian BBM
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="totalAmount" className="text-foreground">
                  Total Biaya (Rp)
                </Label>
                <Input
                  id="totalAmount"
                  type="number"
                  {...form.register('totalAmount', { valueAsNumber: true })}
                  placeholder="500000"
                  className="border-border bg-muted/60 text-foreground"
                />
                {form.formState.errors.totalAmount && (
                  <p className="text-sm text-red-400">{form.formState.errors.totalAmount.message}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-muted/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-amber-400">{formatRupiah(watchTotal || 0)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Nota/Struk *</Label>
              <input
                type="file"
                ref={receiptInputRef}
                accept="image/*"
                onChange={handleReceiptChange}
                className="hidden"
              />
              {receiptPreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="max-h-48 rounded-lg border border-border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 border-border"
                    onClick={() => receiptInputRef.current?.click()}
                  >
                    Ganti Nota
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-border py-8 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  onClick={() => receiptInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload Nota/Struk
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-foreground">
                Tanggal
              </Label>
              <Input
                id="date"
                type="date"
                {...form.register('date')}
                className="border-border bg-muted/60 text-foreground"
              />
              {form.formState.errors.date && (
                <p className="text-sm text-red-400">{form.formState.errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">
                Catatan (Opsional)
              </Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="SPBU, jenis BBM, dll"
                className="border-border bg-muted/60 text-foreground"
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
