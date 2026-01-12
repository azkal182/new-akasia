'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, User } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createUser } from '@/features/users/actions';

const userSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  username: z.string().min(3, 'Username minimal 3 karakter'),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string(),
  role: z.enum(['USER', 'ADMIN', 'DRIVER']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak sama',
  path: ['confirmPassword'],
});

type UserFormData = z.infer<typeof userSchema>;

export default function NewUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'USER',
    },
  });

  async function onSubmit(data: UserFormData) {
    setIsSubmitting(true);
    try {
      const result = await createUser({
        name: data.name,
        username: data.username,
        email: data.email || null,
        password: data.password,
        role: data.role as 'USER' | 'ADMIN' | 'DRIVER',
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pengguna berhasil ditambahkan');
        router.push('/dashboard/users');
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
        <Link href="/dashboard/users">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tambah Pengguna</h1>
          <p className="text-muted-foreground">Buat akun pengguna baru</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-border bg-card/60 max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <User className="h-5 w-5" />
            Data Pengguna
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Nama Lengkap
              </Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="John Doe"
                className="border-border bg-muted/60 text-foreground"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-400">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">
                Username
              </Label>
              <Input
                id="username"
                {...form.register('username')}
                placeholder="johndoe"
                className="border-border bg-muted/60 text-foreground"
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-400">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email (Opsional)
              </Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="john@example.com"
                className="border-border bg-muted/60 text-foreground"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-400">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Role</Label>
              <Select defaultValue="USER" onValueChange={(v) => form.setValue('role', v as 'USER' | 'ADMIN' | 'DRIVER')}>
                <SelectTrigger className="border-border bg-muted/60 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="DRIVER">Driver</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                {...form.register('password')}
                placeholder="••••••••"
                className="border-border bg-muted/60 text-foreground"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-400">{form.formState.errors.password.message}</p>
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
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
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
