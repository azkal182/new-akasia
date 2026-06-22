'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  formatRequirementType,
  formatScheduleDate,
  formatSessionStatus,
  normalizeSchedules,
  sessionBadgeClass,
  type NormalizedSchedule,
} from '@/lib/integration-ui';

type SchedulesResponse = {
  integrationClient?: string;
  divisionId?: string;
  date?: string;
  count?: number;
  schedules?: unknown[];
};

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ProgramKerjaSchedulesPage() {
  const initialDate = useMemo(() => getTodayString(), []);
  const [date, setDate] = useState(initialDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<SchedulesResponse | null>(null);

  const schedules: NormalizedSchedule[] = useMemo(
    () => normalizeSchedules(payload?.schedules ?? []),
    [payload],
  );

  const loadSchedules = useCallback(async (targetDate: string) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (targetDate) {
        params.set('date', targetDate);
      }

      const response = await fetch(`/api/integration/schedules?${params.toString()}`);
      const body = await response.json();

      if (!response.ok) {
        setError(typeof body?.error === 'string' ? body.error : 'Gagal mengambil jadwal divisi');
        return;
      }

      setPayload(body as SchedulesResponse);
    } catch {
      setError('Terjadi kesalahan jaringan saat menghubungi endpoint internal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedules(initialDate);
  }, [initialDate, loadSchedules]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadSchedules(date);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jadwal Kegiatan</h1>
          <p className="text-sm text-muted-foreground">
            Pilih tanggal untuk melihat daftar kegiatan yang sudah dijadwalkan.
          </p>
        </div>
      </div>

      <Card className="border-border bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CalendarDays className="h-5 w-5 text-blue-400" />
            Pilih Tanggal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full space-y-2 sm:max-w-xs">
              <Label htmlFor="date">Tanggal</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500">
                {loading ? 'Memuat...' : 'Tampilkan Jadwal'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadSchedules(date)}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Muat Ulang
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tanggal Dipilih</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">
              {formatScheduleDate(payload?.date ?? date)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sudah Dilaporkan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">
              {
                schedules.filter((schedule) =>
                  ['COMPLETED', 'COMPLETED_WITH_ISSUE'].includes(schedule.sessionStatus ?? ''),
                ).length
              }
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Kegiatan</CardTitle>
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
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Tidak ada kegiatan pada tanggal ini.
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
                  {formatSessionStatus(schedule.sessionStatus)}
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
                  <p className="text-muted-foreground">Bukti yang Diminta</p>
                  <p className="font-medium text-foreground">{formatRequirementType(schedule.requirementType)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jumlah Minimal Bukti</p>
                  <p className="font-medium text-foreground">
                    {schedule.minUploads ? `${schedule.minUploads} file` : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
