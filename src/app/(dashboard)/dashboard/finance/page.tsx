import Link from 'next/link';
import { Plus, ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatRupiah, formatDate } from '@/lib/utils';
import { getTransactions, getBalance, getMonthlyStats } from '@/features/finance/actions';
import { TransactionType } from '@/generated/prisma/enums';

export default async function FinancePage() {
  const now = new Date();
  const [transactions, balance, monthlyStats, incomeTransactions, expenseTransactions] = await Promise.all([
    getTransactions({ limit: 20 }),
    getBalance(),
    getMonthlyStats(now.getFullYear(), now.getMonth() + 1),
    getTransactions({ type: TransactionType.INCOME }),
    getTransactions({ type: TransactionType.EXPENSE }),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Keuangan</h1>
          <p className="text-sm text-muted-foreground">Kelola pemasukan dan pengeluaran</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/finance/report">
            <Button variant="outline" size="sm" className="border-border hover:bg-muted">
              <FileText className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Laporan</span>
            </Button>
          </Link>
          <Link href="/dashboard/finance/income">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Pemasukan</span>
            </Button>
          </Link>
          <Link href="/dashboard/finance/expense">
            <Button variant="outline" size="sm" className="border-border hover:bg-muted">
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Pengeluaran</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Saat Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatRupiah(balance)}
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
              {formatRupiah(monthlyStats.totalIncome)}
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
              {formatRupiah(monthlyStats.totalExpense)}
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
            <div className={`text-2xl font-bold ${monthlyStats.net >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
              {formatRupiah(monthlyStats.net)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Transaksi Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="recent">Transaksi Terakhir</TabsTrigger>
              <TabsTrigger value="income">Pemasukan</TabsTrigger>
              <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
            </TabsList>
            <TabsContent value="recent">
              <TransactionList transactions={transactions} emptyLabel="Belum ada transaksi" />
            </TabsContent>
            <TabsContent value="income">
              <TransactionList transactions={incomeTransactions} emptyLabel="Belum ada pemasukan" />
            </TabsContent>
            <TabsContent value="expense">
              <TransactionList transactions={expenseTransactions} emptyLabel="Belum ada pengeluaran" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionList({
  transactions,
  emptyLabel,
}: {
  transactions: Awaited<ReturnType<typeof getTransactions>>;
  emptyLabel: string;
}) {
  if (transactions.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{emptyLabel}</p>;
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
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                trx.type === 'INCOME'
                  ? 'bg-emerald-500/20 text-emerald-500'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {trx.type === 'INCOME' ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownRight className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">
                {trx.description || `service atau beli sparepart ${trx.expense?.items[0].car?.name ?? ''}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(trx.date)} • {trx.user?.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`font-semibold ${
                trx.type === 'INCOME' ? 'text-emerald-500' : 'text-red-400'
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
                  : trx.type === 'FUEL_PURCHASE'
                    ? 'border-amber-500/50 text-amber-400'
                    : 'border-red-500/50 text-red-400'
              }`}
            >
              {trx.type === 'INCOME'
                ? 'Pemasukan'
                : trx.type === 'FUEL_PURCHASE'
                  ? 'BBM'
                  : 'Pengeluaran'}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
