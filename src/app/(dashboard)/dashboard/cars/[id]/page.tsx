import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Car,
  Fuel,
  FileText,
  Calendar,
  User,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatRupiah, formatDate } from '@/lib/utils';
import { getCarById } from '@/features/cars/actions';

interface CarDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CarDetailPage({ params }: CarDetailPageProps) {
  const { id } = await params;
  const car = await getCarById(id);

  if (!car) {
    notFound();
  }

  // Calculate stats
  const totalFuelCost = car.fuelPurchases.reduce((sum, fp) => sum + fp.totalAmount, 0);
  const totalFuelPurchases = car.fuelPurchases.length;
  const totalUsages = car.usageRecords.length;
  const ongoingUsage = car.usageRecords.find(ur => ur.status === 'ONGOING');
  const unpaidTaxes = car.taxes.filter(t => !t.isPaid);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/cars">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{car.name}</h1>
              <Badge
                variant="outline"
                className={
                  car.status === 'AVAILABLE'
                    ? 'border-emerald-500/50 text-emerald-400'
                    : car.status === 'IN_USE'
                      ? 'border-amber-500/50 text-amber-400'
                      : 'border-red-500/50 text-red-400'
                }
              >
                {car.status === 'AVAILABLE'
                  ? 'Tersedia'
                  : car.status === 'IN_USE'
                    ? 'Digunakan'
                    : 'Maintenance'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{car.licensePlate}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/cars/${id}/edit`}>
            <Button variant="outline" size="sm" className="border-border hover:bg-muted">
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Fuel className="h-4 w-4" />
              Total BBM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-400">
              {formatRupiah(totalFuelCost)}
            </div>
            <p className="text-xs text-muted-foreground">{totalFuelPurchases} transaksi</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Car className="h-4 w-4" />
              Penggunaan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-400">
              {totalUsages}x
            </div>
            <p className="text-xs text-muted-foreground">
              {ongoingUsage ? 'Sedang digunakan' : 'Tidak digunakan'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Pajak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {car.taxes.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {unpaidTaxes.length > 0
                ? `${unpaidTaxes.length} belum dibayar`
                : 'Semua lunas'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Barcode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground truncate">
              {car.barcodeString || '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Usage Alert */}
      {ongoingUsage && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
              <Car className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-300">Sedang Digunakan</p>
              <p className="text-sm text-amber-400/70">
                {ongoingUsage.user?.name} • {ongoingUsage.purpose} ke {ongoingUsage.destination}
              </p>
            </div>
            <p className="text-sm text-amber-400">
              Sejak {formatDate(ongoingUsage.startTime)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Details */}
      <Tabs defaultValue="fuel" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="fuel" className="data-[state=active]:bg-muted">
            <Fuel className="mr-2 h-4 w-4" />
            BBM
          </TabsTrigger>
          <TabsTrigger value="tax" className="data-[state=active]:bg-muted">
            <FileText className="mr-2 h-4 w-4" />
            Pajak
          </TabsTrigger>
          <TabsTrigger value="usage" className="data-[state=active]:bg-muted">
            <Clock className="mr-2 h-4 w-4" />
            Penggunaan
          </TabsTrigger>
        </TabsList>

        {/* Fuel Tab */}
        <TabsContent value="fuel" className="mt-4">
          <Card className="border-border bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <span>Riwayat Pembelian BBM</span>
                <Link href="/dashboard/fuel/purchase">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-500">
                    Isi BBM
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {car.fuelPurchases.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada pembelian BBM
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Tanggal</TableHead>
                      <TableHead className="text-muted-foreground">Jenis</TableHead>
                      <TableHead className="text-muted-foreground">Catatan</TableHead>
                      <TableHead className="text-right text-muted-foreground">Total</TableHead>
                      <TableHead className="text-right text-muted-foreground">Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {car.fuelPurchases.map((fp) => (
                      <TableRow key={fp.id} className="border-border">
                        <TableCell className="text-foreground">
                          {formatDate(fp.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              fp.fuelType === 'SOLAR'
                                ? 'border-green-500/50 text-green-400'
                                : 'border-amber-500/50 text-amber-400'
                            }
                          >
                            {fp.fuelType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {fp.notes || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-amber-400">
                          {formatRupiah(fp.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fp.receiptUrl ? (
                            <Link
                              href={fp.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Lihat
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Tab */}
        <TabsContent value="tax" className="mt-4">
          <Card className="border-border bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <span>Pajak Kendaraan</span>
                <Link href="/dashboard/tax/new">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                    Tambah Pajak
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {car.taxes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada data pajak
                </p>
              ) : (
                <div className="space-y-3">
                  {car.taxes.map((tax) => (
                    <div
                      key={tax.id}
                      className={`flex items-center justify-between rounded-lg p-4 ${
                        tax.isPaid
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'bg-red-500/10 border border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {tax.isPaid ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-400" />
                        )}
                        <div>
                          <p className="font-medium text-foreground">
                            {tax.type === 'ANNUAL' ? 'Pajak Tahunan' : 'Pajak 5 Tahunan'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Jatuh tempo: {formatDate(tax.dueDate)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          tax.isPaid
                            ? 'border-emerald-500/50 text-emerald-400'
                            : 'border-red-500/50 text-red-400'
                        }
                      >
                        {tax.isPaid ? 'Lunas' : 'Belum Bayar'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="mt-4">
          <Card className="border-border bg-card/60">
            <CardHeader>
              <CardTitle className="text-foreground">Riwayat Penggunaan</CardTitle>
            </CardHeader>
            <CardContent>
              {car.usageRecords.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada riwayat penggunaan
                </p>
              ) : (
                <div className="space-y-3">
                  {car.usageRecords.map((usage) => (
                    <div
                      key={usage.id}
                      className="flex items-start justify-between rounded-lg bg-muted/60 p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {usage.user?.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              usage.status === 'ONGOING'
                                ? 'border-amber-500/50 text-amber-400'
                                : 'border-emerald-500/50 text-emerald-400'
                            }
                          >
                            {usage.status === 'ONGOING' ? 'Sedang Digunakan' : 'Selesai'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{usage.purpose} ke {usage.destination}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatDate(usage.startTime)}
                            {usage.endTime && ` - ${formatDate(usage.endTime)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
