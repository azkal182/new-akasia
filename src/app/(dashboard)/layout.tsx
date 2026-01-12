import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar, Header } from '@/components/layout';
import { DriverModeProvider } from '@/contexts/driver-mode-context';
import { DashboardContent } from '@/components/dashboard-content';
import { SidebarWrapper } from '@/components/sidebar-wrapper';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <DriverModeProvider>
      <div className="flex h-screen bg-background text-foreground">
        {/* Desktop Sidebar - hidden on mobile and in driver mode */}
        <SidebarWrapper>
          <Sidebar user={session.user} />
        </SidebarWrapper>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header user={session.user} />
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-muted/40 p-3 sm:p-4 md:p-6">
            <DashboardContent>{children}</DashboardContent>
          </main>
        </div>
        <Toaster position="top-right" richColors />
      </div>
    </DriverModeProvider>
  );
}
