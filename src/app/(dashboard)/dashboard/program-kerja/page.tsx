import Link from 'next/link';
import { ArrowRight, CalendarCheck2, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const menus = [
  {
    title: 'Field Hari Ini',
    description: 'Data otomatis + daftar schedule dengan aksi ke halaman submit laporan dinamis.',
    href: '/dashboard/program-kerja/today',
    icon: CalendarCheck2,
  },
  {
    title: 'Jadwal Divisi',
    description: 'Default fetch hari ini, bisa ganti tanggal dan submit dari setiap card jadwal.',
    href: '/dashboard/program-kerja/schedules',
    icon: CalendarDays,
  },
];

export default function ProgramKerjaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Program Kerja</h1>
        <p className="text-sm text-muted-foreground">
          UI integrasi untuk konsumsi API eksternal melalui endpoint internal `/api/integration/...`.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {menus.map((menu) => (
          <Card key={menu.href} className="border-border bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <menu.icon className="h-5 w-5 text-blue-400" />
                {menu.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{menu.description}</p>
              <Link href={menu.href}>
                <Button variant="outline" className="w-full border-border hover:bg-muted">
                  Buka Menu
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
