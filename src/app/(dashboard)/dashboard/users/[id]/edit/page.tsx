'use client';

import { useState, useEffect, use } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { getUserById, updateUser } from '@/features/users/actions';

const userSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  username: z.string().min(3, 'Username minimal 3 karakter'),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  role: z.enum(['USER', 'ADMIN', 'DRIVER']),
  isActive: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

type UserData = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: 'USER' | 'ADMIN' | 'DRIVER';
  isActive: boolean;
};

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      role: 'USER',
      isActive: true,
    },
  });

  useEffect(() => {
    getUserById(id).then((data) => {
      if (data) {
        setUser(data as UserData);
        form.reset({
          name: data.name,
          username: data.username,
          email: data.email || '',
          role: data.role as 'USER' | 'ADMIN' | 'DRIVER',
          isActive: data.isActive,
        });
      }
      setLoading(false);
    });
  }, [id, form]);

  async function onSubmit(data: UserFormData) {
    setIsSubmitting(true);
    try {
      const result = await updateUser(id, {
        name: data.name,
        username: data.username,
        email: data.email || null,
        role: data.role,
        isActive: data.isActive,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pengguna berhasil diupdate');
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 text-neutral-500">
        Pengguna tidak ditemukan
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/users">
          <Button variant="ghost" size="icon" className="text-neutral-400">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Pengguna</h1>
          <p className="text-neutral-400">Ubah data {user.name}</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-neutral-800 bg-neutral-900/50 max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <User className="h-5 w-5" />
            Data Pengguna
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-neutral-300">
                Nama Lengkap
              </Label>
              <Input
                id="name"
                {...form.register('name')}
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-400">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-neutral-300">
                Username
              </Label>
              <Input
                id="username"
                {...form.register('username')}
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-400">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-300">
                Email (Opsional)
              </Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-400">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">Role</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(v) => form.setValue('role', v as 'USER' | 'ADMIN' | 'DRIVER')}
              >
                <SelectTrigger className="border-neutral-700 bg-neutral-800/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-neutral-700 bg-neutral-900">
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="DRIVER">Driver</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-4">
              <div>
                <Label htmlFor="isActive" className="text-neutral-300">
                  Status Aktif
                </Label>
                <p className="text-sm text-neutral-500">
                  Pengguna nonaktif tidak dapat login
                </p>
              </div>
              <Switch
                id="isActive"
                checked={form.watch('isActive')}
                onCheckedChange={(checked) => form.setValue('isActive', checked)}
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
              <Link href="/dashboard/users">
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
