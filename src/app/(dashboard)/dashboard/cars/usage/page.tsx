'use client';

import { useState, useEffect } from 'react';
import { Play, StopCircle, Car, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { getUsageRecords, getActiveUsageRecords, startCarUsage, endCarUsage, getCars } from '@/features/cars/actions';

type UsageRecord = Awaited<ReturnType<typeof getUsageRecords>>[number];
type ActiveRecord = Awaited<ReturnType<typeof getActiveUsageRecords>>[number];
type CarItem = { id: string; name: string; licensePlate: string | null; status: string };

export default function UsageRecordsPage() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [activeRecords, setActiveRecords] = useState<ActiveRecord[]>([]);
  const [cars, setCars] = useState<CarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ActiveRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedCarId, setSelectedCarId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [allRecords, active, allCars] = await Promise.all([
        getUsageRecords({ limit: 50 }),
        getActiveUsageRecords(),
        getCars(),
      ]);
      setRecords(allRecords);
      setActiveRecords(active);
      setCars(allCars.filter((c) => c.status === 'AVAILABLE'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleStartUsage() {
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
      toast.success('Penggunaan kendaraan dimulai');
      setShowStartDialog(false);
      resetForm();
      loadData();
    }
    setIsSubmitting(false);
  }

  async function handleEndUsage() {
    if (!selectedRecord) return;

    setIsSubmitting(true);
    const result = await endCarUsage({
      recordId: selectedRecord.id,
      endTime: new Date(),
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Penggunaan kendaraan selesai');
      setShowEndDialog(false);
      setSelectedRecord(null);
      loadData();
    }
    setIsSubmitting(false);
  }

  function resetForm() {
    setSelectedCarId('');
    setPurpose('');
    setDestination('');
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Penggunaan Armada</h1>
          <p className="text-neutral-400">Kelola penggunaan kendaraan</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-500" onClick={() => setShowStartDialog(true)}>
          <Play className="mr-2 h-4 w-4" />
          Mulai Penggunaan
        </Button>
      </div>

      {/* Active Usage */}
      {activeRecords.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <Clock className="h-5 w-5" />
              Sedang Digunakan ({activeRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                      <Car className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{record.car.name}</p>
                      <p className="text-sm text-neutral-500">
                        {record.purpose} • {record.destination}
                      </p>
                      <p className="text-xs text-neutral-600">
                        Mulai: {formatDate(record.startTime)} • {record.user.name}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => {
                      setSelectedRecord(record);
                      setShowEndDialog(true);
                    }}
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    Selesai
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader>
          <CardTitle className="text-white">Riwayat Penggunaan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {records.filter((r) => r.endTime).length === 0 ? (
              <p className="text-center text-neutral-500 py-8">
                Belum ada riwayat penggunaan
              </p>
            ) : (
              records
                .filter((r) => r.endTime)
                .map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-700 text-neutral-400">
                        <Car className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{record.car.name}</p>
                        <p className="text-sm text-neutral-500">
                          <MapPin className="mr-1 inline h-3 w-3" />
                          {record.destination} • {record.purpose}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-400">
                        {formatDate(record.startTime)}
                      </p>
                      <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                        Selesai
                      </Badge>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Start Usage Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="border-neutral-800 bg-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-white">Mulai Penggunaan Kendaraan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Kendaraan</Label>
              <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                <SelectTrigger className="border-neutral-700 bg-neutral-800/50 text-white">
                  <SelectValue placeholder="Pilih kendaraan" />
                </SelectTrigger>
                <SelectContent className="border-neutral-700 bg-neutral-900">
                  {cars.map((car) => (
                    <SelectItem key={car.id} value={car.id}>
                      {car.name} - {car.licensePlate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Tujuan Penggunaan</Label>
              <Input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Antar jemput, dinas, dll"
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Tempat Tujuan</Label>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Jakarta, Bandung, dll"
                className="border-neutral-700 bg-neutral-800/50 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)} className="border-neutral-700">
              Batal
            </Button>
            <Button onClick={handleStartUsage} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500">
              {isSubmitting ? 'Menyimpan...' : 'Mulai'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Usage Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="border-neutral-800 bg-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-white">Selesaikan Penggunaan</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="py-4">
              <p className="text-neutral-400">
                Kendaraan: <span className="text-white">{selectedRecord.car.name}</span>
              </p>
              <p className="text-neutral-400">
                Tujuan: <span className="text-white">{selectedRecord.purpose}</span>
              </p>
              <p className="text-neutral-400">
                Mulai: <span className="text-white">{formatDate(selectedRecord.startTime)}</span>
              </p>
            </div>
          )}
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
    </div>
  );
}
