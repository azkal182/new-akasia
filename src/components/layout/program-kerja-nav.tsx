'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck2, CalendarDays, Car as DriverIcon, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { signOut } from 'next-auth/react';
import { useDriverMode } from '@/contexts/driver-mode-context';
import { ThemeToggle } from '@/components/theme-toggle';

interface ProgramKerjaNavProps {
  user: {
    name?: string | null;
    username?: string;
    role?: string;
  };
}

const navItems = [
  {
    title: 'Laporan Hari Ini',
    href: '/dashboard/program-kerja/today',
    icon: CalendarCheck2,
    exact: false,
  },
  {
    title: 'Jadwal Divisi',
    href: '/dashboard/program-kerja/schedules',
    icon: CalendarDays,
    exact: false,
  },
];

export function ProgramKerjaNav({ user }: ProgramKerjaNavProps) {
  const pathname = usePathname();
  const { isDriverMode, toggleDriverMode } = useDriverMode();

  return (
    <header className="flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/70 px-3 sm:px-6 backdrop-blur-sm">
      {/* Logo + Nav Tabs */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
            <DriverIcon className="h-4 w-4 text-white" />
          </div>
          <span className="hidden font-bold text-foreground sm:block">Akasia</span>
        </div>

        {/* Divider */}
        <div className="hidden h-6 w-px bg-border sm:block" />

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-400'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:block">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right side: Driver Mode toggle + User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Driver Mode Toggle */}
        <div className="flex items-center gap-2 rounded-full bg-muted/60 px-2 py-1 sm:px-3 sm:py-1.5">
          <DriverIcon className={`h-4 w-4 ${isDriverMode ? 'text-blue-400' : 'text-muted-foreground'}`} />
          <Switch
            checked={isDriverMode}
            onCheckedChange={toggleDriverMode}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>

        <ThemeToggle />

        {/* User info */}
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-xs sm:text-sm font-medium text-white">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left md:block">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <Badge variant="secondary" className="h-5 text-[10px]">
              {user.role}
            </Badge>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
