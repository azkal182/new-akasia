'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NominalInput } from '@/components/inputs/nominal-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { payTax } from '@/features/tax/actions';

interface TaxPaymentButtonProps {
  taxId: string;
  taxType: string;
  carLabel: string;
  dueDate: Date;
}

export function TaxPaymentButton({ taxId, taxType, carLabel, dueDate }: TaxPaymentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [generateNextTax, setGenerateNextTax] = useState(true);

  // Pre-calculate next year's due date
  const defaultNextDate = new Date(dueDate);
  defaultNextDate.setFullYear(defaultNextDate.getFullYear() + 1);
  const nextDateString = defaultNextDate.toISOString().split('T')[0];
  const [nextDueDate, setNextDueDate] = useState<string>(nextDateString);

  async function handleSubmit() {
    if (!amount || amount <= 0) {
      toast.error('Jumlah pembayaran wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await payTax({
        taxId,
        amount,
        notes: notes.trim() || undefined,
        nextDueDate: generateNextTax && nextDueDate ? new Date(nextDueDate) : undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pembayaran pajak berhasil disimpan');
        setOpen(false);
        setAmount(null);
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
              <NominalInput
                value={amount ?? ''}
                onValueChange={(values) => setAmount(values.floatValue ?? null)}
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

            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="generateNextTax"
                  checked={generateNextTax}
                  onChange={(e) => setGenerateNextTax(e.target.checked)}
                  className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="generateNextTax" className="text-foreground font-medium">
                  {taxType === 'FIVE_YEAR' 
                    ? 'Buat Siklus Pajak 5 Tahun Berikutnya' 
                    : 'Buat Jadwal Pajak Tahun Depan'}
                </Label>
              </div>
              
              {generateNextTax && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="nextDueDate" className="text-sm text-muted-foreground">
                    Tgl. Jatuh Tempo Berikutnya
                  </Label>
                  <input
                    id="nextDueDate"
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    {taxType === 'FIVE_YEAR'
                      ? 'Akan otomatis menjadwalkan 4 Pajak Tahunan dan diakhiri dengan 1 Pajak 5 Tahunan.'
                      : 'Otomatis dijadwalkan untuk tipe Pajak Tahunan (ANNUAL)'}
                  </p>
                </div>
              )}
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
