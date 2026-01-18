'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import moment from 'moment-hijri';
import { ArrowLeft, FileText, Filter, Car, Clock, Users, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { getUsageRecordsByHijriMonth, getCars } from '@/features/cars/actions';

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

type UsageRecord = Awaited<ReturnType<typeof getUsageRecordsByHijriMonth>>['records'][number];
type CarItem = { id: string; name: string; licensePlate: string | null };

export default function CarsReportPage() {
    const currentHijriYear = moment().iYear();
    const currentHijriMonth = moment().iMonth() + 1;

    const [hijriYear, setHijriYear] = useState(currentHijriYear);
    const [hijriMonth, setHijriMonth] = useState(currentHijriMonth);
    const [selectedCarId, setSelectedCarId] = useState<string>('all');
    const [records, setRecords] = useState<UsageRecord[]>([]);
    const [cars, setCars] = useState<CarItem[]>([]);
    const [stats, setStats] = useState({
        totalTrips: 0,
        completedTrips: 0,
        ongoingTrips: 0,
        totalDurationHours: 0,
        uniqueCars: 0,
        uniqueDrivers: 0,
    });
    const [loading, setLoading] = useState(true);

    const years = Array.from({ length: 7 }, (_, i) => currentHijriYear - 5 + i);

    useEffect(() => {
        getCars().then((data) => setCars(data));
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getUsageRecordsByHijriMonth(
                hijriYear,
                hijriMonth,
                selectedCarId === 'all' ? undefined : selectedCarId
            );
            setRecords(result.records);
            setStats(result.stats);
        } finally {
            setLoading(false);
        }
    }, [hijriYear, hijriMonth, selectedCarId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    function formatDuration(startTime: Date, endTime: Date | null): string {
        if (!endTime) return 'Berlangsung';
        const diffMs = endTime.getTime() - startTime.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) {
            return `${hours}j ${minutes}m`;
        }
        return `${minutes} menit`;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/cars">
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Laporan Riwayat Armada</h1>
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
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
                <Card className="border-blue-500/30 bg-blue-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-blue-400">Total Perjalanan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-xl font-bold text-blue-300">{stats.totalTrips}</div>
                    </CardContent>
                </Card>
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-emerald-400">Selesai</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-xl font-bold text-emerald-300">{stats.completedTrips}</div>
                    </CardContent>
                </Card>
                <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-amber-400">Berlangsung</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-xl font-bold text-amber-300">{stats.ongoingTrips}</div>
                    </CardContent>
                </Card>
                <Card className="border-border bg-card/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Durasi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-xl font-bold text-foreground">{stats.totalDurationHours} jam</div>
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
                <Card className="border-border bg-card/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Driver</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-xl font-bold text-foreground">{stats.uniqueDrivers}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Records Table */}
            <Card className="border-border bg-card/60">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <FileText className="h-5 w-5" />
                        Daftar Perjalanan
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-blue-500" />
                        </div>
                    ) : records.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            Tidak ada perjalanan pada bulan ini
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="text-muted-foreground">No</TableHead>
                                        <TableHead className="text-muted-foreground">Tanggal</TableHead>
                                        <TableHead className="text-muted-foreground">Kendaraan</TableHead>
                                        <TableHead className="text-muted-foreground">Driver</TableHead>
                                        <TableHead className="text-muted-foreground">Tujuan</TableHead>
                                        <TableHead className="text-muted-foreground">Keperluan</TableHead>
                                        <TableHead className="text-muted-foreground">Durasi</TableHead>
                                        <TableHead className="text-muted-foreground">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((record, index) => (
                                        <TableRow key={record.id} className="border-border">
                                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell className="text-foreground">{formatDate(record.startTime)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Car className="h-4 w-4 text-blue-400" />
                                                    <div>
                                                        <p className="text-foreground">{record.car.name}</p>
                                                        <p className="text-xs text-muted-foreground">{record.car.licensePlate}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-foreground">{record.user.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-foreground">{record.destination}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-foreground">{record.purpose}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-foreground">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    {formatDuration(record.startTime, record.endTime)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        record.endTime
                                                            ? 'border-emerald-500/50 text-emerald-400'
                                                            : 'border-amber-500/50 text-amber-400'
                                                    }
                                                >
                                                    {record.endTime ? 'Selesai' : 'Berlangsung'}
                                                </Badge>
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
