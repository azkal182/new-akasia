'use client';

import { useState, useRef } from 'react';
import { Car, Fuel, StopCircle, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDate, formatRupiah } from '@/lib/utils';
import { endCarUsage, getCurrentUserDrivingStatus } from '@/features/cars/actions';
import { purchaseFuel } from '@/features/fuel/actions';
import { QRCodeDisplay } from '@/components/ui/qrcode-display';

type DrivingStatus = Awaited<ReturnType<typeof getCurrentUserDrivingStatus>>;

interface DriverStatusCardProps {
  drivingStatus: DrivingStatus;
  onStatusChange: () => void;
}

export function DriverStatusCard({ drivingStatus, onStatusChange }: DriverStatusCardProps) {
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showRefuelDialog, setShowRefuelDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refuel form state
  const [totalAmount, setTotalAmount] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  async function handleEndUsage() {
    if (!drivingStatus) return;

    setIsSubmitting(true);
    const result = await endCarUsage({
      recordId: drivingStatus.id,
      endTime: new Date(),
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Penggunaan kendaraan selesai');
      setShowEndDialog(false);
      onStatusChange();
    }
    setIsSubmitting(false);
  }

  async function handleRefuel() {
    if (!drivingStatus || !totalAmount) {
      toast.error('Total wajib diisi');
      return;
    }

    if (!receiptFile) {
      toast.error('Nota wajib diupload');
      return;
    }

    setIsSubmitting(true);
    const result = await purchaseFuel({
      carId: drivingStatus.car.id,
      totalAmount: Number(totalAmount),
      date: new Date(),
    }, receiptFile);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Pengisian BBM berhasil dicatat');
      setShowRefuelDialog(false);
      setTotalAmount('');
      setReceiptFile(null);
      setReceiptPreview(null);
    }
    setIsSubmitting(false);
  }

  function handleReceiptChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  if (!drivingStatus) {
    return null;
  }

  return (
    <>
      <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-blue-600/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-blue-400">
            <Car className="h-5 w-5" />
            Sedang Mengendarai
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground">{drivingStatus.car.name}</h3>
              <p className="text-sm text-muted-foreground">{drivingStatus.car.licensePlate}</p>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Navigation className="h-3 w-3" />
                {drivingStatus.destination} • {drivingStatus.purpose}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mulai: {formatDate(drivingStatus.startTime)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                onClick={() => setShowRefuelDialog(true)}
              >
                <Fuel className="mr-2 h-4 w-4" />
                Isi BBM
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => setShowEndDialog(true)}
              >
                <StopCircle className="mr-2 h-4 w-4" />
                Selesai
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Display */}
      {drivingStatus.car.barcodeString && (
        <QRCodeDisplay
          value={drivingStatus.car.barcodeString}
          carName={drivingStatus.car.name}
          licensePlate={drivingStatus.car.licensePlate}
          className="mt-4"
        />
      )}

      {/* End Usage Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Selesaikan Penggunaan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Kendaraan: <span className="text-foreground">{drivingStatus.car.name}</span>
            </p>
            <p className="text-muted-foreground">
              Tujuan: <span className="text-foreground">{drivingStatus.purpose}</span>
            </p>
            <p className="text-muted-foreground">
              Mulai: <span className="text-foreground">{formatDate(drivingStatus.startTime)}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)} className="border-border">
              Batal
            </Button>
            <Button onClick={handleEndUsage} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500">
              {isSubmitting ? 'Menyimpan...' : 'Selesai'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refuel Dialog */}
      <Dialog open={showRefuelDialog} onOpenChange={setShowRefuelDialog}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Isi BBM - {drivingStatus.car.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-foreground">Total Biaya</Label>
              <Input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="Contoh: 500000"
                className="border-border bg-muted/60 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Nota/Struk</Label>
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*"
                onChange={handleReceiptChange}
                className="hidden"
              />
              {receiptPreview ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="max-h-40 rounded-lg border border-border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => receiptInputRef.current?.click()}
                    className="border-border"
                  >
                    Ganti Nota
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => receiptInputRef.current?.click()}
                  className="border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                >
                  Upload Nota/Struk
                </Button>
              )}
            </div>
            {Number(totalAmount) > 0 && (
              <div className="rounded-lg bg-muted/60 p-3 text-center">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-amber-400">
                  {formatRupiah(Number(totalAmount))}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefuelDialog(false)} className="border-border">
              Batal
            </Button>
            <Button
              onClick={handleRefuel}
              disabled={isSubmitting || !totalAmount || !receiptFile}
              className="bg-amber-600 hover:bg-amber-500"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
