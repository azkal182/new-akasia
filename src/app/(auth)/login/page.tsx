'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Car } from 'lucide-react';

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { loginSchema, type LoginInput } from '@/features/auth/schemas/auth.schema';
import { login } from '@/features/auth/actions/login.action';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    try {
      const result = await login(data);
      if (result?.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {

      setIsLoading(false);
    }
  }

  return (
    <Card className="border-neutral-800 bg-neutral-900/50 backdrop-blur-sm shadow-2xl">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25">
          <Car className="h-8 w-8 text-white" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-white">
            Akasia
          </CardTitle>
          <CardDescription className="text-neutral-400">
            Sistem Manajemen Armada & Keuangan
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-300">Username</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Masukkan username"
                      disabled={isLoading}
                      className="border-neutral-700 bg-neutral-800/50 text-white placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-300">Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Masukkan password"
                      disabled={isLoading}
                      className="border-neutral-700 bg-neutral-800/50 text-white placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-cyan-500 hover:shadow-blue-500/40"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
