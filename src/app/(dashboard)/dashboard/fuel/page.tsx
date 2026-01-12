import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Fuel, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRupiah, formatDate } from '@/lib/utils';
import { getFuelTransactions, getCurrentHijriDate, getFuelMonthlyReport } from '@/features/fuel/actions';

async function FuelStats() {
  const hijri = await getCurrentHijriDate();
  const report = await getFuelMonthlyReport(hijri.hijriYear, hijri.hijriMonth);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-neutral-400">
            <Calendar className="h-4 w-4" />
            Bulan Hijri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            {report.hijriMonth} {report.hijriYear}
          </div>
          <p className="text-xs text-neutral-500">{hijri.hijriDate}</p>
        </CardContent>
      </Card>

      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-neutral-400">
            Pemasukan BBM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">
            {formatRupiah(report.totalIncome)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-neutral-400">
            Pengeluaran BBM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-400">
            {formatRupiah(report.totalExpense)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-neutral-400">
            Sisa Saldo BBM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${report.balance >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
            {formatRupiah(report.balance)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function FuelTransactionsList() {
  const transactions = await getFuelTransactions();

  return (
    <Card className="border-neutral-800 bg-neutral-900/50">
      <CardHeader>
        <CardTitle className="text-white">Transaksi BBM Bulan Ini</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-center text-neutral-500 py-8">
              Belum ada transaksi BBM bulan ini
            </p>
          ) : (
            transactions.map((trx) => (
              <div
                key={trx.id}
                className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      trx.type === 'INCOME'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {trx.type === 'INCOME' ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <Fuel className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">{trx.description}</p>
                    <p className="text-sm text-neutral-500">
                      {formatDate(trx.date)} • {trx.user?.name}
                    </p>
                    {trx.fuelPurchase && (
                      <p className="text-xs text-neutral-600">
                        {trx.fuelPurchase.literAmount}L @ {formatRupiah(trx.fuelPurchase.pricePerLiter)}/L
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      trx.type === 'INCOME' ? 'text-emerald-500' : 'text-amber-400'
                    }`}
                  >
                    {trx.type === 'INCOME' ? '+' : '-'}
                    {formatRupiah(trx.amount)}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      trx.type === 'INCOME'
                        ? 'border-emerald-500/50 text-emerald-400'
                        : 'border-amber-500/50 text-amber-400'
                    }`}
                  >
                    {trx.type === 'INCOME' ? 'Pemasukan' : 'BBM'}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function FuelPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bahan Bakar</h1>
          <p className="text-neutral-400">Kelola cashflow BBM (kalender Hijri)</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/fuel/income">
            <Button className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="mr-2 h-4 w-4" />
              Pemasukan
            </Button>
          </Link>
          <Link href="/dashboard/fuel/purchase">
            <Button variant="outline" className="border-neutral-700 hover:bg-neutral-800">
              <Fuel className="mr-2 h-4 w-4" />
              Isi BBM
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-neutral-800" />}>
        <FuelStats />
      </Suspense>

      {/* Transactions */}
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-neutral-800" />}>
        <FuelTransactionsList />
      </Suspense>
    </div>
  );
}
