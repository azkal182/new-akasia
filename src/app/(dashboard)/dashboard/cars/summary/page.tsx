import { Car as CarIcon, Clock3, MapPin, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCars } from '@/features/cars/actions';
import { UsageCountdown } from '@/components/usage-countdown';

function formatStartTime(value: Date | string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function getStatus(car: Awaited<ReturnType<typeof getCars>>[number]) {
  const isInUse = car.usageRecords[0]?.endTime === null;

  if (isInUse) {
    return { label: 'Sedang digunakan', className: 'border-amber-500/50 text-amber-400' };
  }

  if (car.status === 'MAINTENANCE') {
    return { label: 'Perawatan', className: 'border-red-500/50 text-red-400' };
  }

  return { label: 'Tersedia', className: 'border-emerald-500/50 text-emerald-400' };
}

export default async function DriverCarsSummaryPage() {
  const cars = await getCars();
  const sortedCars = [...cars].sort((a, b) => {
    const aInUse = a.usageRecords[0]?.endTime === null;
    const bInUse = b.usageRecords[0]?.endTime === null;

    if (aInUse !== bInUse) {
      return aInUse ? -1 : 1;
    }

    return a.name.localeCompare(b.name, 'id');
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ringkasan Armada</h1>
        <p className="text-muted-foreground">Informasi armada yang tersedia untuk operasional.</p>
      </div>

      {cars.length === 0 ? (
        <Card className="border-border bg-card/60">
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada armada yang terdaftar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedCars.map((car) => {
            const status = getStatus(car);
            const activeUsage = car.usageRecords[0]?.endTime === null ? car.usageRecords[0] : null;

            return (
              <Card key={car.id} className="gap-2 border-border bg-card/60">
                <CardHeader className="pb-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                        <CarIcon className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base text-foreground">{car.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{car.licensePlate ?? '-'}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                      {activeUsage && <UsageCountdown usage={activeUsage} align="right" />}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {activeUsage?.user && (
                    <div className="flex items-center gap-2 border-t border-border pt-2 text-amber-400">
                      <UserRound className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words">Digunakan oleh {activeUsage.user.name}</span>
                    </div>
                  )}
                  {activeUsage && (
                    <div className="space-y-2 border-t border-border pt-2 text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">
                          Mulai digunakan: <span className="font-medium text-foreground">{formatStartTime(activeUsage.startTime)}</span>
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CarIcon className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">
                          Keperluan: <span className="font-medium text-foreground">{activeUsage.purpose}</span>
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">
                          Tujuan: <span className="font-medium text-foreground">{activeUsage.destination}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
