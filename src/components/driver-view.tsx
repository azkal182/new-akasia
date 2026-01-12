'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Car, Fuel, Play, StopCircle, Navigation, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDate, formatRupiah } from '@/lib/utils';
import {
  getCurrentUserDrivingStatus,
  getCars,
  startCarUsage,
  endCarUsage,
} from '@/features/cars/actions';
import { purchaseFuel } from '@/features/fuel/actions';

type DrivingStatus = Awaited<ReturnType<typeof getCurrentUserDrivingStatus>>;
type CarItem = { id: string; name: string; licensePlate: string | null; status: string };

export function DriverView() {
  const [drivingStatus, setDrivingStatus] = useState<DrivingStatus>(null);
  const [cars, setCars] = useState<CarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialogs
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showRefuelDialog, setShowRefuelDialog] = useState(false);

  // Start driving form
  const [selectedCarId, setSelectedCarId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');

  // Refuel form
  const [totalAmount, setTotalAmount] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [status, allCars] = await Promise.all([
        getCurrentUserDrivingStatus(),
        getCars(),
      ]);
      setDrivingStatus(status);
      setCars(allCars.filter((c) => c.status === 'AVAILABLE'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleStartDriving() {
    if (!selectedCarId || !purpose || !destination) {
      toast.error('Lengkapi semua field');
      return;
    }

    setIsSubmitting(true);
    const result = await startCarUsage({
      carId: selectedCarId,
      purpose,
      destination,
      startTime: new Date(),
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Mulai mengendarai');
      setShowStartDialog(false);
      setSelectedCarId('');
      setPurpose('');
      setDestination('');
      loadData();
    }
    setIsSubmitting(false);
  }

  async function handleEndDriving() {
    if (!drivingStatus) return;

    setIsSubmitting(true);
    const result = await endCarUsage({
      recordId: drivingStatus.id,
      endTime: new Date(),
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Selesai mengendarai');
      setShowEndDialog(false);
      loadData();
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

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-border border-t-blue-500" />
          <p className="mt-4 text-muted-foreground">Memuat status...</p>
        </div>
      </div>
    );
  }

  // Not driving - show start button
  if (!drivingStatus) {
    return (
      <>
        <div className="flex h-[60vh] items-center justify-center">
          <Card className="w-full max-w-sm border-border bg-card/60">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Car className="h-10 w-10 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl text-foreground">Mode Driver</CardTitle>
              <p className="text-sm text-muted-foreground">
                Anda belum mengendarai kendaraan
              </p>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-500"
                size="lg"
                onClick={() => setShowStartDialog(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                Mulai Mengendarai
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Start Driving Dialog */}
        <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
          <DialogContent className="border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-foreground">Mulai Mengendarai</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-foreground">Pilih Kendaraan</Label>
                <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                  <SelectTrigger className="border-border bg-muted/60 text-foreground">
                    <SelectValue placeholder="Pilih kendaraan" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    {cars.length === 0 ? (
                      <SelectItem value="-" disabled>Tidak ada kendaraan tersedia</SelectItem>
                    ) : (
                      cars.map((car) => (
                        <SelectItem key={car.id} value={car.id}>
                          {car.name} - {car.licensePlate}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Tujuan Penggunaan</Label>
                <Input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Antar jemput, dinas, dll"
                  className="border-border bg-muted/60 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Tempat Tujuan</Label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Jakarta, Bandung, dll"
                  className="border-border bg-muted/60 text-foreground"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStartDialog(false)} className="border-border">
                Batal
              </Button>
              <Button
                onClick={handleStartDriving}
                disabled={isSubmitting || !selectedCarId}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {isSubmitting ? 'Memulai...' : 'Mulai'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Currently driving - show status
  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Status Card */}
        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/20">
                    <Car className="h-8 w-8 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sedang Mengendarai</p>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">{drivingStatus.car.name}</h2>
                    <p className="text-sm text-muted-foreground">{drivingStatus.car.licensePlate}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3">
                  <Navigation className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Keperluan</p>
                    <p className="text-sm font-medium text-foreground">{drivingStatus.purpose}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tujuan</p>
                    <p className="text-sm font-medium text-foreground">{drivingStatus.destination}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Mulai: {formatDate(drivingStatus.startTime)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            size="lg"
            className="h-auto flex-col gap-2 bg-amber-600 py-4 hover:bg-amber-500"
            onClick={() => setShowRefuelDialog(true)}
          >
            <Fuel className="h-6 w-6" />
            <span>Isi BBM</span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-auto flex-col gap-2 border-emerald-500/50 py-4 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setShowEndDialog(true)}
          >
            <StopCircle className="h-6 w-6" />
            <span>Selesai Mengendarai</span>
          </Button>
        </div>
      </div>

      {/* End Driving Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Selesai Mengendarai</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
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
            <Button onClick={handleEndDriving} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500">
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
