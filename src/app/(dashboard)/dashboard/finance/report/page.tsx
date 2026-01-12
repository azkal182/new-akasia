'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import moment from 'moment-hijri';
import { ArrowLeft, FileText, Filter, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatRupiah, formatDate } from '@/lib/utils';
import { getTransactionsByHijriMonth } from '@/features/finance/actions';

const hijriMonths = [
  { value: 1, label: 'Muharram' },
  { value: 2, label: 'Safar' },
  { value: 3, label: "Rabi'ul Awal" },
  { value: 4, label: "Rabi'ul Akhir" },
  { value: 5, label: 'Jumadal Ula' },
  { value: 6, label: 'Jumadal Akhirah' },
  { value: 7, label: 'Rajab' },
  { value: 8, label: "Sya'ban" },
  { value: 9, label: 'Ramadhan' },
  { value: 10, label: 'Syawwal' },
  { value: 11, label: "Dzulqa'dah" },
  { value: 12, label: 'Dzulhijjah' },
];

type Transaction = Awaited<ReturnType<typeof getTransactionsByHijriMonth>>['transactions'][number];

export default function FinanceReportPage() {
  const currentHijriYear = moment().iYear();
  const currentHijriMonth = moment().iMonth() + 1;

  const [hijriYear, setHijriYear] = useState(currentHijriYear);
  const [hijriMonth, setHijriMonth] = useState(currentHijriMonth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, openingBalance: 0, closingBalance: 0, previousMonthBalance: 0 });
  const [loading, setLoading] = useState(true);

  const years = Array.from({ length: 7 }, (_, i) => currentHijriYear - 5 + i);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTransactionsByHijriMonth(hijriYear, hijriMonth);
      setTransactions(result.transactions);
      setStats(result.stats);
    } finally {
      setLoading(false);
    }
  }, [hijriYear, hijriMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/finance">
          <Button variant="ghost" size="icon" className="text-neutral-400">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Laporan Keuangan</h1>
          <p className="text-neutral-400">
            {hijriMonths.find((m) => m.value === hijriMonth)?.label} {hijriYear}H
          </p>
        </div>
      </div>

      {/* Filter */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-neutral-400">
            <Filter className="h-4 w-4" />
            Filter Bulan Hijri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Tahun</Label>
              <Select value={hijriYear.toString()} onValueChange={(v) => setHijriYear(parseInt(v))}>
                <SelectTrigger className="w-24 border-neutral-700 bg-neutral-800/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-neutral-700 bg-neutral-900">
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Bulan</Label>
              <Select value={hijriMonth.toString()} onValueChange={(v) => setHijriMonth(parseInt(v))}>
                <SelectTrigger className="w-40 border-neutral-700 bg-neutral-800/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-neutral-700 bg-neutral-900">
                  {hijriMonths.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-amber-400">Saldo Bulan Lalu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-bold text-amber-300">{formatRupiah(stats.previousMonthBalance)}</div>
          </CardContent>
        </Card>
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-neutral-400">Saldo Awal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-bold text-white">{formatRupiah(stats.openingBalance)}</div>
          </CardContent>
        </Card>
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-neutral-400">Total Pemasukan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-bold text-emerald-500">{formatRupiah(stats.totalIncome)}</div>
          </CardContent>
        </Card>
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-neutral-400">Total Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-bold text-red-400">{formatRupiah(stats.totalExpense)}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-400">Saldo Akhir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-bold text-blue-300">{formatRupiah(stats.closingBalance)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5" />
            Daftar Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-blue-500" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-neutral-500 py-8">
              Tidak ada transaksi pada bulan ini
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-800 hover:bg-transparent">
                    <TableHead className="text-neutral-400">No</TableHead>
                    <TableHead className="text-neutral-400">Tanggal</TableHead>
                    <TableHead className="text-neutral-400">Keterangan</TableHead>
                    <TableHead className="text-neutral-400">Items</TableHead>
                    <TableHead className="text-right text-neutral-400">Debit</TableHead>
                    <TableHead className="text-right text-neutral-400">Kredit</TableHead>
                    <TableHead className="text-right text-neutral-400">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    let runningBalance = stats.openingBalance;
                    return transactions.map((trx, index) => {
                      // Calculate running balance
                      if (trx.type === 'INCOME') {
                        runningBalance += trx.amount;
                      } else {
                        runningBalance -= trx.amount;
                      }

                      return (
                        <TableRow key={trx.id} className="border-neutral-800">
                          <TableCell className="text-neutral-400">{index + 1}</TableCell>
                          <TableCell className="text-neutral-300">{formatDate(trx.date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                                trx.type === 'INCOME'
                                  ? 'bg-emerald-500/20 text-emerald-500'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {trx.type === 'INCOME' ? (
                                  <ArrowUpRight className="h-3 w-3" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3" />
                                )}
                              </div>
                              <span className="text-white">{trx.description}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {trx.expense?.items && trx.expense.items.length > 0 ? (
                              <ul className="text-xs text-neutral-400 space-y-0.5">
                                {trx.expense.items.map((item, i) => (
                                  <li key={i}>
                                    {item.description} (x{item.quantity}) - {formatRupiah(item.total)}
                                  </li>
                                ))}
                              </ul>
                            ) : trx.income ? (
                              <span className="text-xs text-neutral-500">{trx.income.source}</span>
                            ) : trx.fuelPurchase ? (
                              <span className="text-xs text-neutral-500">
                                {trx.fuelPurchase.car?.name} - {formatRupiah(trx.fuelPurchase.totalAmount)}
                              </span>
                            ) : (
                              <span className="text-neutral-600">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {trx.type === 'INCOME' ? (
                              <span className="text-emerald-500">{formatRupiah(trx.amount)}</span>
                            ) : (
                              <span className="text-neutral-600">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {trx.type !== 'INCOME' ? (
                              <span className="text-red-400">{formatRupiah(trx.amount)}</span>
                            ) : (
                              <span className="text-neutral-600">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium text-blue-400">
                            {formatRupiah(runningBalance)}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
