"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Wallet,
  ClipboardList,
  Fuel,
  FileText,
  Shield,
  Receipt,
  CalendarCheck2,
  CalendarDays,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { can, type UserRole } from "@/lib/permissions";
import { useDriverMode } from "@/contexts/driver-mode-context";

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
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Keuangan", href: "/dashboard/finance", icon: Wallet },
  { title: "Belanja", href: "/spending", icon: ClipboardList },
  { title: "Armada", href: "/dashboard/cars", icon: Car },
  { title: "BBM", href: "/dashboard/fuel", icon: Fuel },
  { title: "Pengajuan", href: "/dashboard/pengajuan", icon: FileText },
  { title: "Perizinan", href: "/dashboard/perizinan", icon: Shield },
  { title: "Pajak", href: "/dashboard/tax", icon: Receipt },
];

const adminMenuItems = [
  { title: "Pengguna", href: "/dashboard/users", icon: Users },
  { title: "Pengaturan", href: "/dashboard/settings", icon: Settings },
];

const programKerjaItems = [
  { title: "Laporan Hari Ini", href: "/dashboard/program-kerja/today", icon: CalendarCheck2 },
  { title: "Jadwal Divisi", href: "/dashboard/program-kerja/schedules", icon: CalendarDays },
];

const driverMenuItems = [
  {
    title: "Operasional",
    href: "/dashboard",
    icon: Car,
    match: (pathname: string) => !pathname.startsWith("/dashboard/program-kerja"),
  },
  {
    title: "Laporan Hari Ini",
    href: "/dashboard/program-kerja/today",
    icon: CalendarCheck2,
    match: (pathname: string) =>
      pathname === "/dashboard/program-kerja/today" ||
      pathname.startsWith("/dashboard/program-kerja/today/"),
  },
  {
    title: "Jadwal Divisi",
    href: "/dashboard/program-kerja/schedules",
    icon: CalendarDays,
    match: (pathname: string) =>
      pathname === "/dashboard/program-kerja/schedules" ||
      pathname.startsWith("/dashboard/program-kerja/schedules/"),
  },
];

export function MobileSidebar({
  user,
  open,
  onOpenChange,
}: MobileSidebarProps) {
  const pathname = usePathname();
  const { isDriverMode } = useDriverMode();

  const handleLinkClick = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 border-border bg-card p-0">
        <SheetHeader className="flex h-16 flex-row items-center gap-2 border-b border-border px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
            <Car className="h-5 w-5 text-white" />
          </div>
          <div>
            <SheetTitle className="text-left font-bold text-foreground">
              Akasia
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              {isDriverMode ? "Mode Driver" : "Fleet Management"}
            </p>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-4rem)] px-3 py-4">
          <nav className="space-y-1">
            {isDriverMode ? (
              <>
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Menu Driver
                </p>
                {driverMenuItems.map((item) => {
                  const isActive = item.match(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-400"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.title}
                    </Link>
                  );
                })}
              </>
            ) : (
              <>
                {can.viewMainMenu((user.role as UserRole) ?? 'USER') && menuItems.map((item) => {
                  // Dashboard should only be active on exact match
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-400"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.title}
                    </Link>
                  );
                })}

                <Separator className="my-4 bg-border" />
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Program Kerja
                </p>
                {programKerjaItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        "ml-2 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-400"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.title}
                    </Link>
                  );
                })}

                {user.role === "ADMIN" && (
                  <>
                    <Separator className="my-4 bg-border" />
                    <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Admin
                    </p>
                    {adminMenuItems.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={handleLinkClick}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all",
                            isActive
                              ? "bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-400"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.title}
                        </Link>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </nav>
        </ScrollArea>

      </SheetContent>
    </Sheet>
  );
}
