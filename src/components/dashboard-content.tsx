'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useDriverMode } from '@/contexts/driver-mode-context';
import { DriverView } from '@/components/driver-view';

interface DashboardContentProps {
  children: ReactNode;
}

export function DashboardContent({ children }: DashboardContentProps) {
  const { isDriverMode } = useDriverMode();
  const pathname = usePathname();

  // Saat driver mode aktif:
  // - Jika sedang di halaman Program Kerja → tampilkan halaman tersebut (children)
  // - Jika di halaman lain → tampilkan DriverView (operasional kendaraan)
  if (isDriverMode && !pathname.startsWith('/dashboard/program-kerja')) {
    return <DriverView />;
  }

  return <>{children}</>;
}
