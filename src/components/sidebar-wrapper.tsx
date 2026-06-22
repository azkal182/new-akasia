'use client';

import { ReactNode } from 'react';

interface SidebarWrapperProps {
  children: ReactNode;
}

export function SidebarWrapper({ children }: SidebarWrapperProps) {
  return <div className="hidden lg:flex">{children}</div>;
}
