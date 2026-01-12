'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Car,
  Wallet,
  Fuel,
  FileText,
  Shield,
  Receipt,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { signOut } from 'next-auth/react';

interface MobileSidebarProps {
  user: {
    name?: string | null;
    username?: string;
    role?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const menuItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Keuangan', href: '/dashboard/finance', icon: Wallet },
  { title: 'Armada', href: '/dashboard/cars', icon: Car },
  { title: 'BBM', href: '/dashboard/fuel', icon: Fuel },
  { title: 'Pengajuan', href: '/dashboard/pengajuan', icon: FileText },
  { title: 'Perizinan', href: '/dashboard/perizinan', icon: Shield },
  { title: 'Pajak', href: '/dashboard/tax', icon: Receipt },
];

const adminMenuItems = [
  { title: 'Pengguna', href: '/dashboard/users', icon: Users },
  { title: 'Pengaturan', href: '/dashboard/settings', icon: Settings },
];

export function MobileSidebar({ user, open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 border-neutral-800 bg-neutral-900 p-0">
        <SheetHeader className="flex h-16 flex-row items-center gap-2 border-b border-neutral-800 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
            <Car className="h-5 w-5 text-white" />
          </div>
          <div>
            <SheetTitle className="text-left font-bold text-white">Akasia</SheetTitle>
            <p className="text-xs text-neutral-500">Fleet Management</p>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] px-3 py-4">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              // Dashboard should only be active on exact match
              const isActive = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-400'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              );
            })}

            {user.role === 'ADMIN' && (
              <>
                <Separator className="my-4 bg-neutral-800" />
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Admin
                </p>
                {adminMenuItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-400'
                          : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.title}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </ScrollArea>

        {/* User Profile & Logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-900 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-neutral-800/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-neutral-700 to-neutral-600">
              <span className="text-sm font-medium text-white">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-neutral-500">@{user.username}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-400 hover:bg-neutral-700 hover:text-white"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
