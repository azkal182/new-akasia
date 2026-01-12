'use client';

import { ReactNode } from 'react';
import { useDriverMode } from '@/contexts/driver-mode-context';

interface SidebarWrapperProps {
  children: ReactNode;
}

export function SidebarWrapper({ children }: SidebarWrapperProps) {
  const { isDriverMode } = useDriverMode();

  if (isDriverMode) {
    return null;
  }

  return <div className="hidden lg:flex">{children}</div>;
}
