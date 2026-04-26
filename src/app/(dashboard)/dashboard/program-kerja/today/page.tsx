'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, RefreshCw, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  asRecord,
  formatScheduleDate,
  getRecordString,
  normalizeSchedules,
  sessionBadgeClass,
  type NormalizedSchedule,
} from '@/lib/integration-ui';

type FieldTodayResponse = {
  integrationClient?: string;
  divisionId?: string;
  schedules?: unknown[];
};

export default function ProgramKerjaTodayPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<FieldTodayResponse | unknown[] | null>(null);

  const rawSchedules = useMemo(() => {
    if (Array.isArray(payload)) {
      return payload;
    }

    return payload?.schedules ?? [];
  }, [payload]);

  const schedules: NormalizedSchedule[] = useMemo(
    () => normalizeSchedules(rawSchedules),
    [rawSchedules],
  );

  const integrationClientLabel = useMemo(() => {
    if (!payload || Array.isArray(payload)) {
      return '-';
    }

    return payload.integrationClient ?? '-';
  }, [payload]);

  const divisionLabel = useMemo(() => {
    if (!payload) {
      return '-';
    }

    if (!Array.isArray(payload)) {
      return payload.divisionId ?? '-';
    }

    const first = asRecord(payload[0]);
    const program = asRecord(first?.program);
    const division = asRecord(program?.division);
    return getRecordString(division, 'id') ?? '-';
  }, [payload]);

  const loadToday = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/integration/field/today');
      const body = await response.json();

      if (!response.ok) {
        setError(typeof body?.error === 'string' ? body.error : 'Gagal mengambil data field hari ini');
        return;
      }

      setPayload(body as FieldTodayResponse | unknown[]);
    } catch {
      setError('Terjadi kesalahan jaringan saat menghubungi endpoint internal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Field Hari Ini</h1>
          <p className="text-sm text-muted-foreground">
            Data otomatis dimuat saat halaman dibuka. Pilih schedule untuk lanjut submit laporan.
          </p>
        </div>
        <Button type="button" onClick={() => void loadToday()} disabled={loading} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          {loading ? 'Memuat...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Integration Client</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">{integrationClientLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Division ID</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate text-lg font-semibold text-foreground">{divisionLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">{schedules.length}</p>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Card className="border-red-500/40 bg-red-500/10">
          <CardContent className="pt-6 text-sm text-red-300">{error}</CardContent>
        </Card>
      ) : null}

      {!error && !loading && schedules.length === 0 ? (
        <Card className="border-border bg-card/60">
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 pt-6 text-center">
            <CalendarCheck2 className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Belum ada schedule untuk hari ini.</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {schedules.map((schedule) => (
          <Card key={schedule.scheduleId} className="border-border bg-card/60">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="line-clamp-2 text-base text-foreground">{schedule.programName}</CardTitle>
                <Badge variant="outline" className={sessionBadgeClass(schedule.sessionStatus)}>
                  {schedule.sessionStatus ?? 'DRAFT'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Tanggal</p>
                  <p className="font-medium text-foreground">{formatScheduleDate(schedule.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jam</p>
                  <p className="font-medium text-foreground">{schedule.scheduleTime ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipe Bukti</p>
                  <p className="font-medium text-foreground">{schedule.requirementType ?? '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Minimum Upload</p>
                  <p className="font-medium text-foreground">{schedule.minUploads ?? '-'}</p>
                </div>
              </div>

              <Link href={`/dashboard/program-kerja/today/${encodeURIComponent(schedule.scheduleId)}`}>
                <Button
                  className={`w-full ${
                    schedule.sessionStatus === 'COMPLETED'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : schedule.sessionStatus === 'COMPLETED_WITH_ISSUE'
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {schedule.sessionStatus === 'COMPLETED'
                    ? 'Laporan Selesai'
                    : schedule.sessionStatus === 'COMPLETED_WITH_ISSUE'
                      ? 'Selesai dengan Catatan'
                      : schedule.sessionStatus && schedule.sessionStatus !== 'DRAFT'
                        ? 'Lihat Status Laporan'
                        : 'Submit Laporan'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
