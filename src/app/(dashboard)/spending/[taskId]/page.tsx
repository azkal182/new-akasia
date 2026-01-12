import Link from 'next/link';
import { ArrowLeft, Wallet, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatRupiah } from '@/lib/utils';
import { getSpendingTaskById } from '@/features/spending/actions';
import { FundingForm } from '@/features/spending/components/funding-form';
import { ReceiptForm } from '@/features/spending/components/receipt-form';
import { SettlementActions } from '@/features/spending/components/settlement-actions';
import { CashbackForm } from '@/features/spending/components/cashback-form';

interface SpendingTaskDetailPageProps {
  params: Promise<{ taskId: string }>;
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'Draf';
    case 'FUNDED':
      return 'Didanai';
    case 'SPENDING':
      return 'Belanja';
    case 'NEEDS_REFUND':
      return 'Perlu Pengembalian';
    case 'NEEDS_REIMBURSE':
      return 'Perlu Penggantian';
    case 'SETTLED':
      return 'Selesai';
    default:
      return status;
  }
}

export default async function SpendingTaskDetailPage({ params }: SpendingTaskDetailPageProps) {
  const { taskId } = await params;
  const data = await getSpendingTaskById(taskId);

  if (!data) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Anggaran tidak ditemukan.
      </div>
    );
  }

  const { task, summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/spending">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
            <p className="text-muted-foreground">
              Dibuat {formatDate(task.createdAt)} • {task.createdBy?.name}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-blue-500/50 text-blue-400">
          {getStatusLabel(task.status)}
        </Badge>
      </div>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Anggaran</p>
            <p className="text-lg font-semibold text-foreground">{formatRupiah(summary.budget)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Nota</p>
            <p className="text-lg font-semibold text-foreground">{formatRupiah(summary.totalReceipts)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Selisih</p>
            <p className={`text-lg font-semibold ${summary.diff >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
              {formatRupiah(summary.diff)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status Penyelesaian</p>
            <p className="text-lg font-semibold text-foreground">
              {summary.refundDue > 0
                ? `Pengembalian ${formatRupiah(summary.refundDue)}`
                : summary.reimburseDue > 0
                  ? `Penggantian ${formatRupiah(summary.reimburseDue)}`
                  : 'Tidak ada'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Pendanaan</CardTitle>
        </CardHeader>
        <CardContent>
          <FundingForm taskId={task.id} funding={task.funding} isLocked={summary.isLocked} />
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">Nota</CardTitle>
          {summary.isLocked && (
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
              <CheckCircle2 className="mr-2 h-3 w-3" />
              Terkunci
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {task.receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada nota.</p>
          ) : (
            <div className="space-y-3">
              {task.receipts.map((receipt) => (
                <div key={receipt.id} className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{receipt.vendor || 'Nota'}</p>
                      <p className="text-xs text-muted-foreground">
                        {receipt.receiptDate ? formatDate(receipt.receiptDate) : 'Tanggal tidak tersedia'}
                      </p>
                    </div>
                    <p className="font-semibold text-foreground">{formatRupiah(receipt.totalAmount)}</p>
                  </div>
                  {receipt.items.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {receipt.items.map((item) => (
                        <li key={item.id}>
                          {item.description} • {item.quantity} x {formatRupiah(item.unitPrice)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {receipt.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {receipt.attachments.map((attachment) => (
                        <Link
                          key={attachment.id}
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Lihat Lampiran
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground">Pengembalian Dana</p>
                    {receipt.cashbacks.length === 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">Belum ada pengembalian.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {receipt.cashbacks.map((cashback) => (
                          <div key={cashback.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                            <div>
                              <p className="text-xs font-medium text-foreground">{cashback.vendor || 'Pengembalian'}</p>
                              <p className="text-[11px] text-muted-foreground">{formatDate(cashback.occurredAt)}</p>
                            </div>
                            <p className="text-sm font-semibold text-emerald-500">{formatRupiah(cashback.amount)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3">
                      <CashbackForm receiptId={receipt.id} isLocked={summary.isLocked} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <ReceiptForm taskId={task.id} isLocked={summary.isLocked} />
          <Link href="/spending/wallet" className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300">
            <Wallet className="mr-2 h-4 w-4" />
            Lihat Dompet
          </Link>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="text-foreground">Penyelesaian</CardTitle>
        </CardHeader>
        <CardContent>
          <SettlementActions
            taskId={task.id}
            refundDue={summary.refundDue}
            reimburseDue={summary.reimburseDue}
            isLocked={summary.isLocked}
          />
        </CardContent>
      </Card>

    </div>
  );
}
