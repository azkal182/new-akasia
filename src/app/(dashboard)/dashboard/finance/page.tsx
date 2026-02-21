import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Download,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
  getTransactions,
  getBalance,
  getMonthlyStats,
} from "@/features/finance/actions";
import { getCars } from "@/features/cars/actions";
import { TransactionType } from "@/generated/prisma/enums";
import { TransactionActions } from "@/features/finance/components/transaction-actions";

type CarOption = {
  id: string;
  name: string;
  licensePlate: string | null;
};

export default async function FinancePage() {
  const now = new Date();
  const [
    transactions,
    balance,
    monthlyStats,
    incomeTransactions,
    expenseTransactions,
    cars,
  ] = await Promise.all([
    getTransactions({ limit: 20 }),
    getBalance(),
    getMonthlyStats(now.getFullYear(), now.getMonth() + 1),
    getTransactions({ type: TransactionType.INCOME, limit: 50 }),
    getTransactions({ type: TransactionType.EXPENSE, limit: 50 }),
    getCars(),
  ]);

  const carOptions: CarOption[] = cars.map((car) => ({
    id: car.id,
    name: car.name,
    licensePlate: car.licensePlate,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Keuangan
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola pemasukan dan pengeluaran
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/finance/report">
            <Button
              variant="outline"
              size="sm"
              className="border-border hover:bg-muted"
            >
              <FileText className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Laporan</span>
            </Button>
          </Link>
          <Link href="/dashboard/finance/income">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500">
              <Download className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Pemasukan</span>
            </Button>
          </Link>
          <Link href="/dashboard/finance/expense">
            <Button
              variant="outline"
              size="sm"
              className="border-border hover:bg-muted"
            >
              <Upload className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Pengeluaran</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Saat Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
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
            <div className="text-xl font-bold text-emerald-500">
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
            <div className="text-xl font-bold text-red-400">
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
            <div
              className={`text-xl font-bold ${
                monthlyStats.net >= 0 ? "text-emerald-500" : "text-red-400"
              }`}
            >
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
              <TransactionList
                transactions={transactions}
                cars={carOptions}
                emptyLabel="Belum ada transaksi"
              />
            </TabsContent>
            <TabsContent value="income">
              <TransactionList
                transactions={incomeTransactions}
                cars={carOptions}
                emptyLabel="Belum ada pemasukan"
              />
            </TabsContent>
            <TabsContent value="expense">
              <TransactionList
                transactions={expenseTransactions}
                cars={carOptions}
                emptyLabel="Belum ada pengeluaran"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionList({
  transactions,
  cars,
  emptyLabel,
}: {
  transactions: Awaited<ReturnType<typeof getTransactions>>;
  cars: CarOption[];
  emptyLabel: string;
}) {
  if (transactions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">{emptyLabel}</p>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-3">
      {transactions.map((trx) => (
        <div
          key={trx.id}
          className="flex flex-col gap-3 rounded-lg bg-muted/60 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
        >
          <div className="flex items-start gap-3 sm:items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                trx.type === "INCOME"
                  ? "bg-emerald-500/20 text-emerald-500"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {trx.type === "INCOME" ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownRight className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">
                {trx.description ||
                  `service atau beli sparepart ${
                    trx.expense?.items[0].car?.name ?? ""
                  }`}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(trx.date)} • {trx.user?.name}
              </p>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
            <div className="text-left sm:text-right">
              <p
                className={`font-semibold ${
                  trx.type === "INCOME" ? "text-emerald-500" : "text-red-400"
                }`}
              >
                {trx.type === "INCOME" ? "+" : "-"}
                {formatRupiah(trx.amount)}
              </p>
              <Badge
                variant="outline"
                className={`text-xs ${
                  trx.type === "INCOME"
                    ? "border-emerald-500/50 text-emerald-400"
                    : trx.type === "FUEL_PURCHASE"
                    ? "border-amber-500/50 text-amber-400"
                    : "border-red-500/50 text-red-400"
                }`}
              >
                {trx.type === "INCOME"
                  ? "Pemasukan"
                  : trx.type === "FUEL_PURCHASE"
                  ? "BBM"
                  : "Pengeluaran"}
              </Badge>
            </div>
            <TransactionActions transaction={trx} cars={cars} />
          </div>
        </div>
      ))}
    </div>
  );
}
