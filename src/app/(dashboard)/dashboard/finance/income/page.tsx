'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NominalInput } from '@/components/inputs/nominal-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { createIncomeSchema, type CreateIncomeInput } from '@/features/finance/schemas/transaction.schema';
import { createIncome } from '@/features/finance/actions';

export default function IncomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateIncomeInput>({
    resolver: zodResolver(createIncomeSchema),
    defaultValues: {
      amount: 0,
      source: 'Yayasan',
      date: new Date(),
      notes: '',
    },
  });

  async function onSubmit(data: CreateIncomeInput) {
    setIsLoading(true);
    try {
      const result = await createIncome(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pemasukan berhasil disimpan');
        router.push('/dashboard/finance');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/finance">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Input Pemasukan</h1>
          <p className="text-muted-foreground">Tambah pemasukan baru</p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-xl border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Detail Pemasukan</CardTitle>
          <CardDescription className="text-muted-foreground">
            Masukkan informasi pemasukan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Tanggal</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        disabled={isLoading}
                        className="border-border bg-muted/60 text-foreground"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Sumber</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Contoh: Yayasan, Donasi, dll"
                        disabled={isLoading}
                        className="border-border bg-muted/60 text-foreground"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Jumlah (Rp)</FormLabel>
                    <FormControl>
                      <NominalInput
                        value={field.value ?? 0}
                        onValueChange={(values) => field.onChange(values.floatValue ?? 0)}
                        name={field.name}
                        onBlur={field.onBlur}
                        placeholder="0"
                        disabled={isLoading}
                        className="border-border bg-muted/60 text-foreground"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Catatan (Opsional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Catatan tambahan"
                        disabled={isLoading}
                        className="border-border bg-muted/60 text-foreground"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Pemasukan'
                  )}
                </Button>
                <Link href="/dashboard/finance">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    className="border-border"
                  >
                    Batal
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
