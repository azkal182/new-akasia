'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { payTax } from '@/features/tax/actions';

interface TaxPaymentButtonProps {
  taxId: string;
  carLabel: string;
}

export function TaxPaymentButton({ taxId, carLabel }: TaxPaymentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) {
      toast.error('Jumlah pembayaran wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await payTax({
        taxId,
        amount: Number(amount),
        notes: notes.trim() || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pembayaran pajak berhasil disimpan');
        setOpen(false);
        setAmount('');
        setNotes('');
        router.refresh();
      }
    } catch {
      toast.error('Gagal menyimpan pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-500"
        onClick={() => setOpen(true)}
      >
        Bayar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Pembayaran Pajak</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              {carLabel}
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Jumlah (Rp)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="1000000"
                className="border-border bg-muted/60 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Catatan (Opsional)</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Nomor kwitansi, lokasi pembayaran, dll"
                className="border-border bg-muted/60 text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
