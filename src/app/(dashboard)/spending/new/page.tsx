'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createSpendingTask } from '@/features/spending/actions';
import { createTaskSchema, type CreateTaskInput } from '@/features/spending/schemas';

export default function NewSpendingTaskPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  async function onSubmit(data: CreateTaskInput) {
    setIsSubmitting(true);
    try {
      const result = await createSpendingTask(data);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.task?.id) {
        toast.success('Anggaran berhasil dibuat');
        router.push(`/spending/${result.task.id}`);
      }
    } catch {
      toast.error('Gagal membuat anggaran');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/spending">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Anggaran Baru</h1>
          <p className="text-muted-foreground">Buat anggaran pembelanjaan baru</p>
        </div>
      </div>

      <Card className="border-border bg-card/60 max-w-xl">
        <CardHeader>
          <CardTitle className="text-foreground">Informasi Anggaran</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Judul</Label>
              <Input
                {...form.register('title')}
                placeholder="Contoh: Pembelian material proyek A"
                className="border-border bg-muted/60 text-foreground"
              />
              {form.formState.errors.title && (
                <p className="text-xs text-red-400">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Deskripsi (Opsional)</Label>
              <Textarea
                {...form.register('description')}
                placeholder="Catatan tambahan"
                className="border-border bg-muted/60 text-foreground"
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Anggaran'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
