'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatRupiah } from '@/lib/utils';
import { markRefundDone, markReimburseDone } from '../actions';

interface SettlementActionsProps {
  taskId: string;
  refundDue: number;
  reimburseDue: number;
  isLocked: boolean;
}

export function SettlementActions({ taskId, refundDue, reimburseDue, isLocked }: SettlementActionsProps) {
  const [refundNotes, setRefundNotes] = useState('');
  const [reimburseNotes, setReimburseNotes] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [isSubmittingReimburse, setIsSubmittingReimburse] = useState(false);

  async function handleRefund() {
    if (refundDue <= 0) return;
    setIsSubmittingRefund(true);
    try {
      const result = await markRefundDone(taskId, refundNotes);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Pengembalian ditandai selesai');
        setRefundNotes('');
      }
    } catch {
      toast.error('Gagal menyimpan pengembalian');
    } finally {
      setIsSubmittingRefund(false);
    }
  }

  async function handleReimburse() {
    if (reimburseDue <= 0) return;
    setIsSubmittingReimburse(true);
    try {
      const result = await markReimburseDone(taskId, reimburseNotes);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Penggantian ditandai selesai');
        setReimburseNotes('');
      }
    } catch {
      toast.error('Gagal menyimpan penggantian');
    } finally {
      setIsSubmittingReimburse(false);
    }
  }

  return (
    <div className="space-y-4">
      {refundDue > 0 && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="font-medium text-emerald-500">
            Pengembalian wajib disetor: {formatRupiah(refundDue)}
          </p>
          <div className="mt-3 space-y-2">
            <Label className="text-foreground">Catatan</Label>
            <Textarea
              value={refundNotes}
              onChange={(event) => setRefundNotes(event.target.value)}
              className="border-border bg-muted/60 text-foreground"
              disabled={isLocked}
            />
            <Button
              type="button"
              onClick={handleRefund}
              disabled={isLocked || isSubmittingRefund}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isSubmittingRefund ? 'Menyimpan...' : 'Tandai Pengembalian Selesai'}
            </Button>
          </div>
        </div>
      )}

      {reimburseDue > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="font-medium text-amber-500">
            Penggantian wajib dibayar: {formatRupiah(reimburseDue)}
          </p>
          <div className="mt-3 space-y-2">
            <Label className="text-foreground">Catatan</Label>
            <Textarea
              value={reimburseNotes}
              onChange={(event) => setReimburseNotes(event.target.value)}
              className="border-border bg-muted/60 text-foreground"
              disabled={isLocked}
            />
            <Button
              type="button"
              onClick={handleReimburse}
              disabled={isLocked || isSubmittingReimburse}
              className="bg-amber-600 hover:bg-amber-500"
            >
              {isSubmittingReimburse ? 'Menyimpan...' : 'Tandai Penggantian Selesai'}
            </Button>
          </div>
        </div>
      )}

      {refundDue === 0 && reimburseDue === 0 && (
        <p className="text-sm text-muted-foreground">Tidak ada penyelesaian yang perlu dilakukan.</p>
      )}
    </div>
  );
}
