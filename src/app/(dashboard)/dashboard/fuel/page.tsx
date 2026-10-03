import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Fuel, ArrowUpRight, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatRupiah, formatDate } from '@/lib/utils';
import { getFuelTransactions, getCurrentHijriDate, getFuelMonthlyReport } from '@/features/fuel/actions';
import { FuelTransactionActions } from '@/features/fuel/components/fuel-transaction-actions';
import { getCars } from '@/features/cars/actions';
import { auth } from '@/lib/auth';
import { can, type UserRole } from '@/lib/permissions';

type FuelTransaction = Awaited<ReturnType<typeof getFuelTransactions>>[number];

async function FuelStats() {
  const hijri = await getCurrentHijriDate();
  const report = await getFuelMonthlyReport(hijri.hijriYear, hijri.hijriMonth);

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-amber-400">
            Saldo Bulan Lalu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-amber-300">
            {formatRupiah(report.previousMonthBalance)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo Saat Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-xl font-bold ${report.currentBalance >= 0 ? 'text-foreground' : 'text-red-400'}`}>
            {formatRupiah(report.currentBalance)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pemasukan Bulan Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">
            {formatRupiah(report.totalIncome)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pengeluaran Bulan Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-400">
            {formatRupiah(report.totalExpense)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net Bulan Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-xl font-bold ${report.balance >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
            {formatRupiah(report.balance)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function FuelTransactionsList() {
  const hijri = await getCurrentHijriDate();
  const [transactions, cars] = await Promise.all([
    getFuelTransactions({
      hijriYear: hijri.hijriYear,
      hijriMonth: hijri.hijriMonth,
    }),
    getCars(),
  ]);

  return (
    <Card className="border-border bg-card/60">
      <CardHeader>
        <CardTitle className="text-foreground">Transaksi BBM Bulan Ini (Hijriah)</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="recent">Transaksi Terakhir</TabsTrigger>
            <TabsTrigger value="income">Pemasukan</TabsTrigger>
            <TabsTrigger value="purchase">Pengeluaran/BBM</TabsTrigger>
          </TabsList>
          <TabsContent value="recent">
            <FuelTransactionList
              transactions={transactions}
              cars={cars}
              emptyLabel="Belum ada transaksi BBM bulan ini"
            />
          </TabsContent>
          <TabsContent value="income">
            <FuelTransactionList
              transactions={transactions.filter((trx) => trx.type === 'INCOME')}
              cars={cars}
              emptyLabel="Belum ada pemasukan BBM bulan ini"
            />
          </TabsContent>
          <TabsContent value="purchase">
            <FuelTransactionList
              transactions={transactions.filter((trx) => trx.type === 'FUEL_PURCHASE')}
              cars={cars}
              emptyLabel="Belum ada pembelian BBM bulan ini"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function FuelTransactionList({
  transactions,
  cars,
  emptyLabel,
}: {
  transactions: FuelTransaction[];
  cars: Awaited<ReturnType<typeof getCars>>;
  emptyLabel: string;
}) {
  if (transactions.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {transactions.map((trx) => (
        <div
          key={trx.id}
          className="flex items-center justify-between rounded-lg bg-muted/60 p-4"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${trx.type === 'INCOME'
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
              <p className="font-medium text-foreground">{trx.description}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(trx.date)} • {trx.user?.name}
              </p>
              {trx.fuelPurchase && (
                <p className="text-xs text-muted-foreground">
                  {trx.fuelPurchase.car?.name}
                  {trx.fuelPurchase.notes ? ` • ${trx.fuelPurchase.notes}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p
                className={`font-semibold ${trx.type === 'INCOME' ? 'text-emerald-500' : 'text-amber-400'
                  }`}
              >
                {trx.type === 'INCOME' ? '+' : '-'}
                {formatRupiah(trx.amount)}
              </p>
              <Badge
                variant="outline"
                className={`text-xs ${trx.type === 'INCOME'
                  ? 'border-emerald-500/50 text-emerald-400'
                  : 'border-amber-500/50 text-amber-400'
                  }`}
              >
                {trx.type === 'INCOME' ? 'Pemasukan' : 'BBM'}
              </Badge>
            </div>
            <FuelTransactionActions transaction={trx} cars={cars} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function FuelPage() {
  const session = await auth();
  const role = (session?.user?.role as UserRole) ?? 'USER';
  const showSummary = can.viewFuelSummary(role);
  const showReports = can.viewReports(role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bahan Bakar</h1>
          <p className="text-sm text-muted-foreground">Kelola cashflow BBM (kalender Hijri)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showReports && (
            <Link href="/dashboard/fuel/report">
              <Button variant="outline" size="sm" className="border-border hover:bg-muted">
                <ClipboardList className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">Laporan</span>
              </Button>
            </Link>
          )}
          <Link href="/dashboard/fuel/income">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Pemasukan</span>
            </Button>
          </Link>
          <Link href="/dashboard/fuel/purchase">
            <Button variant="outline" size="sm" className="border-border hover:bg-muted">
              <Fuel className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Isi BBM</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats — hanya ADMIN */}
      {showSummary && (
        <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted" />}>
          <FuelStats />
        </Suspense>
      )}

      {/* Transactions */}
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
        <FuelTransactionsList />
      </Suspense>
    </div>
  );
}
