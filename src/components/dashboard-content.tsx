'use client';

import { ReactNode } from 'react';
import { useDriverMode } from '@/contexts/driver-mode-context';
import { DriverView } from '@/components/driver-view';

interface DashboardContentProps {
  children: ReactNode;
}

export function DashboardContent({ children }: DashboardContentProps) {
  const { isDriverMode } = useDriverMode();

  if (isDriverMode) {
    return <DriverView />;
  }

  return <>{children}</>;
}
