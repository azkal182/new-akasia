'use client';

import { useState } from 'react';
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
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');

  const totalPrice = parseFloat(liters || '0') * parseFloat(pricePerLiter || '0');

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
    if (!drivingStatus || !liters || !pricePerLiter) {
      toast.error('Lengkapi semua field');
      return;
    }

    setIsSubmitting(true);
    const result = await purchaseFuel({
      carId: drivingStatus.car.id,
      literAmount: parseFloat(liters),
      pricePerLiter: parseFloat(pricePerLiter),
      date: new Date(),
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Pengisian BBM berhasil dicatat');
      setShowRefuelDialog(false);
      setLiters('');
      setPricePerLiter('');
    }
    setIsSubmitting(false);
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
              <h3 className="text-xl font-bold text-white">{drivingStatus.car.name}</h3>
              <p className="text-sm text-neutral-400">{drivingStatus.car.licensePlate}</p>
              <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                <Navigation className="h-3 w-3" />
                {drivingStatus.destination} • {drivingStatus.purpose}
              </div>
              <p className="text-xs text-neutral-600 mt-1">
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

      {/* End Usage Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="border-neutral-800 bg-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-white">Selesaikan Penggunaan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-neutral-400">
              Kendaraan: <span className="text-white">{drivingStatus.car.name}</span>
            </p>
            <p className="text-neutral-400">
              Tujuan: <span className="text-white">{drivingStatus.purpose}</span>
            </p>
            <p className="text-neutral-400">
              Mulai: <span className="text-white">{formatDate(drivingStatus.startTime)}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)} className="border-neutral-700">
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
        <DialogContent className="border-neutral-800 bg-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-white">Isi BBM - {drivingStatus.car.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Jumlah Liter</Label>
              <Input
                type="number"
                step="0.1"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="Contoh: 45"
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Harga per Liter</Label>
              <Input
                type="number"
                value={pricePerLiter}
                onChange={(e) => setPricePerLiter(e.target.value)}
                placeholder="Contoh: 12000"
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
            </div>
            {totalPrice > 0 && (
              <div className="rounded-lg bg-neutral-800/50 p-3 text-center">
                <p className="text-sm text-neutral-400">Total</p>
                <p className="text-xl font-bold text-amber-400">{formatRupiah(totalPrice)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefuelDialog(false)} className="border-neutral-700">
              Batal
            </Button>
            <Button
              onClick={handleRefuel}
              disabled={isSubmitting || !liters || !pricePerLiter}
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
