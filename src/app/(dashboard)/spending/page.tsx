import Link from "next/link";
import { FileText, Plus, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRupiah } from "@/lib/utils";
import { getSpendingTasks } from "@/features/spending/actions";

function getStatusLabel(status: string) {
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
}

export default async function SpendingTasksPage() {
  const tasks = await getSpendingTasks();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Anggaran Belanja
          </h1>
          <p className="text-sm text-muted-foreground">
            Pendataan pembelanjaan berbasis anggaran
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/spending/report">
            <Button
              variant="outline"
              size="sm"
              className="border-border hover:bg-accent"
            >
              <FileText className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Laporan</span>
            </Button>
          </Link>
          <Link href="/spending/wallet">
            <Button
              variant="outline"
              size="sm"
              className="border-border hover:bg-accent"
            >
              <Wallet className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Dompet</span>
            </Button>
          </Link>
          <Link href="/spending/new">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Anggaran Baru</span>
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Daftar Anggaran</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada anggaran.
            </p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/spending/${task.id}`}
                  className="block rounded-lg border border-border bg-muted/60 p-4 hover:bg-accent"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dibuat {formatDate(task.createdAt)} •{" "}
                        {task.createdBy?.name}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-blue-500/50 text-blue-400"
                    >
                      {getStatusLabel(task.status)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">Anggaran</p>
                      <p className="font-medium text-foreground">
                        {formatRupiah(task.summary.budget)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Nota</p>
                      <p className="font-medium text-foreground">
                        {formatRupiah(task.summary.totalReceipts)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Selisih</p>
                      <p
                        className={`font-medium ${task.summary.diff >= 0 ? "text-emerald-500" : "text-red-400"}`}
                      >
                        {formatRupiah(task.summary.diff)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
