'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Key } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getUserById, changePassword } from '@/features/users/actions';

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password tidak sama',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

type UserData = {
  id: string;
  name: string;
  username: string;
};

export default function ChangePasswordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    getUserById(id).then((data) => {
      if (data) {
        setUser(data as UserData);
      }
      setLoading(false);
    });
  }, [id]);

  async function onSubmit(data: PasswordFormData) {
    setIsSubmitting(true);
    try {
      const result = await changePassword({
        userId: id,
        newPassword: data.newPassword,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Password berhasil diubah');
        router.push('/dashboard/users');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Pengguna tidak ditemukan
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/users">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ubah Password</h1>
          <p className="text-muted-foreground">
            Reset password untuk {user.name} (@{user.username})
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-border bg-card/60 max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Key className="h-5 w-5" />
            Password Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-foreground">
                Password Baru
              </Label>
              <Input
                id="newPassword"
                type="password"
                {...form.register('newPassword')}
                placeholder="••••••••"
                className="border-border bg-muted/60 text-foreground"
              />
              {form.formState.errors.newPassword && (
                <p className="text-sm text-red-400">{form.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                Konfirmasi Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                {...form.register('confirmPassword')}
                placeholder="••••••••"
                className="border-border bg-muted/60 text-foreground"
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-400">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Password'}
              </Button>
              <Link href="/dashboard/users">
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
