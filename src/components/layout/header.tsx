'use client';

import { useState } from 'react';
import { Bell, Search, Menu, Car as DriverIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { signOut } from 'next-auth/react';
import { MobileSidebar } from './mobile-sidebar';
import { useDriverMode } from '@/contexts/driver-mode-context';

interface HeaderProps {
  user: {
    name?: string | null;
    username?: string;
    role?: string;
  };
}

export function Header({ user }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDriverMode, toggleDriverMode } = useDriverMode();

  return (
    <>
      <header className="flex h-14 sm:h-16 items-center justify-between border-b border-neutral-800 bg-neutral-900/50 px-3 sm:px-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          {!isDriverMode && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-neutral-400 hover:text-white"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          {isDriverMode ? (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                <DriverIcon className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-white">Driver Mode</span>
            </div>
          ) : (
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                placeholder="Cari..."
                className="w-48 md:w-64 border-neutral-700 bg-neutral-800/50 pl-9 text-sm text-white placeholder:text-neutral-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Driver Mode Toggle */}
          <div className="flex items-center gap-2 rounded-full bg-neutral-800/50 px-2 py-1 sm:px-3 sm:py-1.5">
            <DriverIcon className={`h-4 w-4 ${isDriverMode ? 'text-blue-400' : 'text-neutral-500'}`} />
            <Switch
              checked={isDriverMode}
              onCheckedChange={toggleDriverMode}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>

          {!isDriverMode && (
            /* Notifications */
            <Button
              variant="ghost"
              size="icon"
              className="relative text-neutral-400 hover:bg-neutral-800 hover:text-white h-8 w-8 sm:h-10 sm:w-10"
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-500" />
            </Button>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-1 sm:px-2 hover:bg-neutral-800">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-xs sm:text-sm font-medium text-white">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    {isDriverMode ? 'Driver' : user.role}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 border-neutral-800 bg-neutral-900"
            >
              <DropdownMenuLabel className="text-neutral-400">
                Akun Saya
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-neutral-800" />
              <DropdownMenuItem className="cursor-pointer text-neutral-300 focus:bg-neutral-800 focus:text-white">
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-neutral-300 focus:bg-neutral-800 focus:text-white">
                Pengaturan
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-800" />
              <DropdownMenuItem
                className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Sidebar - only when not in driver mode */}
      {!isDriverMode && (
        <MobileSidebar
          user={user}
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
        />
      )}
    </>
  );
}
