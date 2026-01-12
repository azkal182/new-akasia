import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatRupiah } from "@/lib/utils";
import { getSpendingReport } from "@/features/spending/actions";

const monthLabels = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default async function SpendingReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = parseNumber(params?.year, now.getFullYear());
  const month = Math.min(
    12,
    Math.max(1, parseNumber(params?.month, now.getMonth() + 1))
  );

  const report = await getSpendingReport(year, month);

  const prevDate = new Date(year, month - 2, 1);
  const nextDate = new Date(year, month, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;
  const nextYear = nextDate.getFullYear();
  const nextMonth = nextDate.getMonth() + 1;

  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 5 + i);
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "Draf";
      case "FUNDED":
        return "Didanai";
      case "SPENDING":
        return "Belanja";
      case "NEEDS_REFUND":
        return "Perlu Pengembalian";
      case "NEEDS_REIMBURSE":
        return "Perlu Penggantian";
      case "SETTLED":
        return "Selesai";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/spending">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Laporan Anggaran
            </h1>
            <p className="text-sm text-muted-foreground">
              Periode pendanaan: {monthLabels[month - 1]} {year}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/spending/report?year=${prevYear}&month=${prevMonth}`}>
            <Button variant="outline" size="sm" className="border-border">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Bulan Lalu
            </Button>
          </Link>
          <Link href={`/spending/report?year=${nextYear}&month=${nextMonth}`}>
            <Button variant="outline" size="sm" className="border-border">
              Bulan Depan
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            Filter Periode Pendanaan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action="/spending/report"
            method="get"
            className="flex flex-wrap items-end gap-4"
          >
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tahun</label>
              <select
                name="year"
                defaultValue={year}
                className="h-9 w-24 rounded-md border border-border bg-muted/60 px-2 text-sm text-foreground"
              >
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Bulan</label>
              <select
                name="month"
                defaultValue={month}
                className="h-9 w-44 rounded-md border border-border bg-muted/60 px-2 text-sm text-foreground"
              >
                {monthLabels.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline" className="border-border">
              Terapkan
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Catatan: laporan ini berbasis tanggal pendanaan (receivedAt).
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Pendanaan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {formatRupiah(report.totals.totalFunding)}
            </div>
            <p className="text-xs text-muted-foreground">
              {report.totals.taskCount} anggaran didanai
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Nota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {formatRupiah(report.totals.totalReceipts)}
            </div>
            <p className="text-xs text-muted-foreground">
              {report.totals.tasksWithoutReceipts} anggaran tanpa nota
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pengembalian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-500">
              {formatRupiah(report.totals.totalRefundDue)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Penggantian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-400">
              {formatRupiah(report.totals.totalReimburseDue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {report.unfundedTasks.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-400">
              Anggaran tanpa pendanaan di periode ini (
              {report.totals.unfundedCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.unfundedTasks.map((task) => (
              <Link
                key={task.id}
                href={`/spending/${task.id}`}
                className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(task.createdAt)} • {task.createdBy?.name ?? "-"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-500/50 text-amber-400"
                >
                  Belum didanai
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Rincian Anggaran</CardTitle>
        </CardHeader>
        <CardContent>
          {report.tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Tidak ada anggaran dengan pendanaan di periode ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">
                      Anggaran
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Pendanaan
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Anggaran
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Total Nota
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Selisih
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Penyelesaian
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.tasks.map((task) => {
                    const settlementLabel =
                      task.refundDue > 0
                        ? `Refund ${formatRupiah(task.refundDue)}`
                        : task.reimburseDue > 0
                        ? `Reimburse ${formatRupiah(task.reimburseDue)}`
                        : "Seimbang";
                    const settlementStatus =
                      task.refundSettlement?.status ??
                      task.reimburseSettlement?.status ??
                      null;

                    return (
                      <TableRow key={task.id} className="border-border">
                        <TableCell>
                          <Link
                            href={`/spending/${task.id}`}
                            className="font-medium text-foreground hover:text-blue-400"
                          >
                            {task.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Dibuat {formatDate(task.createdAt)} •{" "}
                            {task.createdBy ?? "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">
                            {task.funding
                              ? formatDate(task.funding.receivedAt)
                              : "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.funding?.source ?? "Sumber tidak tersedia"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {formatRupiah(task.funding?.amount ?? 0)}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {formatRupiah(task.receiptsTotal)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            task.diff >= 0 ? "text-emerald-500" : "text-red-400"
                          }`}
                        >
                          {formatRupiah(task.diff)}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">
                            {settlementLabel}
                          </p>
                          {settlementStatus && (
                            <p className="text-xs text-muted-foreground">
                              {settlementStatus === "DONE"
                                ? "Sudah selesai"
                                : "Menunggu"}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-blue-500/50 text-blue-400"
                          >
                            {getStatusLabel(task.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
