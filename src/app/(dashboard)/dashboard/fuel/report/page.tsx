'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import moment from 'moment-hijri';
import { ArrowLeft, FileText, Filter, Fuel, Car } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatRupiah, formatDate } from '@/lib/utils';
import { getFuelPurchasesByHijriMonth } from '@/features/fuel/actions';
import { getCars } from '@/features/cars/actions';

const hijriMonths = [
    { value: 1, label: 'Muharram' },
    { value: 2, label: 'Safar' },
    { value: 3, label: "Rabi'ul Awal" },
    { value: 4, label: "Rabi'ul Akhir" },
    { value: 5, label: 'Jumadal Ula' },
    { value: 6, label: 'Jumadal Akhirah' },
    { value: 7, label: 'Rajab' },
    { value: 8, label: "Sya'ban" },
    { value: 9, label: 'Ramadhan' },
    { value: 10, label: 'Syawwal' },
    { value: 11, label: "Dzulqa'dah" },
    { value: 12, label: 'Dzulhijjah' },
];

type FuelPurchase = Awaited<ReturnType<typeof getFuelPurchasesByHijriMonth>>['purchases'][number];
type FuelByCar = Awaited<ReturnType<typeof getFuelPurchasesByHijriMonth>>['fuelByCar'][number];
type CarItem = { id: string; name: string; licensePlate: string | null };

export default function FuelReportPage() {
    const currentHijriYear = moment().iYear();
    const currentHijriMonth = moment().iMonth() + 1;

    const [hijriYear, setHijriYear] = useState(currentHijriYear);
    const [hijriMonth, setHijriMonth] = useState(currentHijriMonth);
    const [selectedCarId, setSelectedCarId] = useState<string>('all');
    const [purchases, setPurchases] = useState<FuelPurchase[]>([]);
    const [fuelByCar, setFuelByCar] = useState<FuelByCar[]>([]);
    const [cars, setCars] = useState<CarItem[]>([]);
    const [stats, setStats] = useState({
        totalPurchases: 0,
        totalAmount: 0,
        totalIncome: 0,
        balance: 0,
        uniqueCars: 0,
    });
    const [loading, setLoading] = useState(true);

    const years = Array.from({ length: 7 }, (_, i) => currentHijriYear - 5 + i);

    useEffect(() => {
        getCars().then((data) => setCars(data));
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getFuelPurchasesByHijriMonth(
                hijriYear,
                hijriMonth,
                selectedCarId === 'all' ? undefined : selectedCarId
            );
            setPurchases(result.purchases);
            setStats(result.stats);
            setFuelByCar(result.fuelByCar);
        } finally {
            setLoading(false);
        }
    }, [hijriYear, hijriMonth, selectedCarId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/fuel">
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Laporan BBM</h1>
                    <p className="text-muted-foreground">
                        {hijriMonths.find((m) => m.value === hijriMonth)?.label} {hijriYear}H
                    </p>
                </div>
            </div>

            {/* Filter */}
            <Card className="border-border bg-card/60">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        Filter Bulan Hijri
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Tahun</Label>
                            <Select value={hijriYear.toString()} onValueChange={(v) => setHijriYear(parseInt(v))}>
                                <SelectTrigger className="w-24 border-border bg-muted/60 text-foreground">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-border bg-card">
                                    {years.map((y) => (
                                        <SelectItem key={y} value={y.toString()}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Bulan</Label>
                            <Select value={hijriMonth.toString()} onValueChange={(v) => setHijriMonth(parseInt(v))}>
                                <SelectTrigger className="w-40 border-border bg-muted/60 text-foreground">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-border bg-card">
                                    {hijriMonths.map((m) => (
                                        <SelectItem key={m.value} value={m.value.toString()}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Kendaraan</Label>
                            <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                                <SelectTrigger className="w-48 border-border bg-muted/60 text-foreground">
                                    <SelectValue placeholder="Semua kendaraan" />
                                </SelectTrigger>
                                <SelectContent className="border-border bg-card">
                                    <SelectItem value="all">Semua kendaraan</SelectItem>
                                    {cars.map((car) => (
                                        <SelectItem key={car.id} value={car.id}>
                                            {car.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-emerald-400">Pemasukan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-xl font-bold text-emerald-300">{formatRupiah(stats.totalIncome)}</div>
                    </CardContent>
                </Card>
                <Card className="border-red-500/30 bg-red-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-red-400">Pengeluaran</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-xl font-bold text-red-300">{formatRupiah(stats.totalAmount)}</div>
                    </CardContent>
                </Card>
                <Card className="border-blue-500/30 bg-blue-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-blue-400">Saldo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-lg sm:text-xl font-bold ${stats.balance >= 0 ? 'text-blue-300' : 'text-red-400'}`}>
                            {formatRupiah(stats.balance)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border bg-card/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Transaksi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-xl font-bold text-foreground">{stats.totalPurchases}</div>
                    </CardContent>
                </Card>
                <Card className="border-border bg-card/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Kendaraan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-xl font-bold text-foreground">{stats.uniqueCars}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Fuel by Car Summary */}
            {fuelByCar.length > 0 && selectedCarId === 'all' && (
                <Card className="border-border bg-card/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Car className="h-5 w-5" />
                            BBM per Kendaraan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {fuelByCar.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3"
                                >
                                    <div>
                                        <p className="font-medium text-foreground">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">{item.plate} • {item.count}x</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-red-400">{formatRupiah(item.amount)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Purchases Table */}
            <Card className="border-border bg-card/60">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <FileText className="h-5 w-5" />
                        Daftar Pembelian BBM
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-blue-500" />
                        </div>
                    ) : purchases.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            Tidak ada pembelian BBM pada bulan ini
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="text-muted-foreground">No</TableHead>
                                        <TableHead className="text-muted-foreground">Tanggal</TableHead>
                                        <TableHead className="text-muted-foreground">Kendaraan</TableHead>
                                        <TableHead className="text-muted-foreground">User</TableHead>
                                        <TableHead className="text-muted-foreground">Catatan</TableHead>
                                        <TableHead className="text-right text-muted-foreground">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchases.map((purchase, index) => (
                                        <TableRow key={purchase.id} className="border-border">
                                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell className="text-foreground">{formatDate(purchase.createdAt)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Fuel className="h-4 w-4 text-amber-400" />
                                                    <div>
                                                        <p className="text-foreground">{purchase.car.name}</p>
                                                        <p className="text-xs text-muted-foreground">{purchase.car.licensePlate}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-foreground">
                                                {purchase.transaction?.user?.name || '-'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground max-w-xs truncate">
                                                {purchase.notes || '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-red-400">
                                                {formatRupiah(purchase.totalAmount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
