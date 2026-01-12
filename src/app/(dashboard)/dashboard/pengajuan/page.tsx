import Link from 'next/link';
import { Plus, FileCheck, Clock, XCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRupiah, formatDate } from '@/lib/utils';
import { getPengajuans } from '@/features/pengajuan/actions';

export default async function PengajuanPage() {
  const pengajuans = await getPengajuans();

  const pendingCount = pengajuans.filter((p) => p.status === 'PENDING').length;
  const approvedCount = pengajuans.filter((p) => p.status === 'APPROVED').length;
  const rejectedCount = pengajuans.filter((p) => p.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pengajuan</h1>
          <p className="text-neutral-400">Kelola pengajuan pembelian dan perbaikan</p>
        </div>
        <Link href="/dashboard/pengajuan/new">
          <Button className="bg-blue-600 hover:bg-blue-500">
            <Plus className="mr-2 h-4 w-4" />
            Buat Pengajuan
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-neutral-400">
              <Clock className="h-4 w-4 text-amber-500" />
              Menunggu Persetujuan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-neutral-400">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Disetujui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{approvedCount}</div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-neutral-400">
              <XCircle className="h-4 w-4 text-red-400" />
              Ditolak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pengajuan List */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader>
          <CardTitle className="text-white">Daftar Pengajuan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pengajuans.length === 0 ? (
              <p className="text-center text-neutral-500 py-8">
                Belum ada pengajuan
              </p>
            ) : (
              pengajuans.map((p) => {
                const totalEstimation = p.items.reduce((sum, item) => sum + item.estimation, 0);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        p.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : p.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        <FileCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          Pengajuan #{p.id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {formatDate(p.createdAt)} • {p.items.length} item
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {formatRupiah(totalEstimation)}
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
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
