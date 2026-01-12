import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Toaster } from '@/components/ui/sonner';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirect to dashboard if already logged in
  const session = await auth();
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/20 via-transparent to-transparent" />
      <main className="relative z-10 w-full max-w-md px-4">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
