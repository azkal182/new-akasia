import Link from 'next/link';
import { Plus, Shield, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { getPerizinans, getPendingPerizinans } from '@/features/perizinan/actions';
import TokenGenerator from '@/features/perizinan/components/token-generator';
import PerizinanActions from '@/features/perizinan/components/perizinan-actions';

export default async function PerizinanPage() {
  const [allPerizinans, pendingPerizinans] = await Promise.all([
    getPerizinans(),
    getPendingPerizinans(),
  ]);

  const approvedCount = allPerizinans.filter((p) => p.status === 'APPROVED').length;
  const rejectedCount = allPerizinans.filter((p) => p.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perizinan</h1>
          <p className="text-muted-foreground">Kelola izin penggunaan kendaraan</p>
        </div>
        <Link href="/dashboard/perizinan/new">
          <Button className="bg-blue-600 hover:bg-blue-500">
            <Plus className="mr-2 h-4 w-4" />
            Buat Perizinan
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-amber-500" />
              Menunggu Persetujuan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingPerizinans.length}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Disetujui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{approvedCount}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ditolak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Token Generator */}
      <TokenGenerator />

      {/* Perizinan List */}
      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Daftar Perizinan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allPerizinans.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Belum ada data perizinan
              </p>
            ) : (
              allPerizinans.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-muted/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      p.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : p.status === 'REJECTED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.destination} • {p.car.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.purpose} • {p.numberOfPassengers} penumpang
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {formatDate(p.date)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Est: {p.estimation} hari
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        p.status === 'APPROVED'
                          ? 'border-emerald-500/50 text-emerald-400'
                          : p.status === 'REJECTED'
                            ? 'border-red-500/50 text-red-400'
                            : 'border-amber-500/50 text-amber-400'
                      }
                    >
                      {p.status === 'APPROVED' ? 'Disetujui' : p.status === 'REJECTED' ? 'Ditolak' : 'Pending'}
                    </Badge>
                    {p.status === 'PENDING' && (
                      <PerizinanActions perizinanId={p.id} status={p.status} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
