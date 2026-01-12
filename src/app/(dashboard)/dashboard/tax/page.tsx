import Link from 'next/link';
import { Plus, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRupiah, formatDate } from '@/lib/utils';
import { getTaxes, getUpcomingTaxes } from '@/features/tax/actions';

export default async function TaxPage() {
  const [allTaxes, upcomingTaxes] = await Promise.all([
    getTaxes(),
    getUpcomingTaxes(30),
  ]);

  const pendingCount = allTaxes.filter((t) => !t.isPaid).length;
  const paidCount = allTaxes.filter((t) => t.isPaid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pajak Kendaraan</h1>
          <p className="text-neutral-400">Kelola pajak dan STNK</p>
        </div>
        <Link href="/dashboard/tax/new">
          <Button className="bg-blue-600 hover:bg-blue-500">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pajak
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-neutral-400">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Jatuh Tempo 30 Hari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{upcomingTaxes.length}</div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">
              Belum Dibayar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-neutral-400">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Sudah Dibayar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{paidCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tax List */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader>
          <CardTitle className="text-white">Daftar Pajak</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allTaxes.length === 0 ? (
              <p className="text-center text-neutral-500 py-8">
                Belum ada data pajak
              </p>
            ) : (
              allTaxes.map((tax) => {
                const isOverdue = !tax.isPaid && new Date(tax.dueDate) < new Date();
                const totalPaid = tax.payments.reduce((sum, p) => sum + p.amount, 0);
                return (
                  <div
                    key={tax.id}
                    className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        tax.isPaid
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : isOverdue
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {tax.type === 'FIVE_YEAR' ? 'STNK 5 Tahunan' : 'Pajak Tahunan'}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {tax.car.name} • {tax.car.licensePlate}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-400">
                        Jatuh tempo: {formatDate(tax.dueDate)}
                      </p>
                      <div className="flex items-center gap-2">
                        {totalPaid > 0 && (
                          <span className="text-sm text-emerald-400">
                            {formatRupiah(totalPaid)}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            tax.isPaid
                              ? 'border-emerald-500/50 text-emerald-400'
                              : isOverdue
                                ? 'border-red-500/50 text-red-400'
                                : 'border-amber-500/50 text-amber-400'
                          }
                        >
                          {tax.isPaid ? 'Lunas' : isOverdue ? 'Terlambat' : 'Pending'}
                        </Badge>
                      </div>
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
