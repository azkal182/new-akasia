'use client';

import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { formatUsageEstimate } from '@/features/cars/utils';

type UsageCountdownProps = {
  usage: {
    startTime: Date | string;
    estimatedDurationMinutes?: number | null;
    estimatedDays?: number | null;
  };
  align?: 'left' | 'right';
};

export function UsageCountdown({ usage, align = 'left' }: UsageCountdownProps) {
  const [now, setNow] = useState<number | null>(null);
  const durationMinutes =
    usage.estimatedDurationMinutes ??
    (usage.estimatedDays ? usage.estimatedDays * 1440 : null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!durationMinutes) {
    return null;
  }

  const estimatedEndTime = new Date(usage.startTime).getTime() + durationMinutes * 60 * 1000;
  const remainingSeconds = now === null
    ? null
    : Math.max(0, Math.ceil((estimatedEndTime - now) / 1000));
  const days = remainingSeconds === null ? 0 : Math.floor(remainingSeconds / 86400);
  const hours = remainingSeconds === null ? 0 : Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = remainingSeconds === null ? 0 : Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds === null ? 0 : remainingSeconds % 60;
  const clock = [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
  const expired = remainingSeconds === 0;

  return (
    <div className={`space-y-0.5 text-xs ${align === 'right' ? 'text-right' : ''}`}>
      <p className="text-muted-foreground">Estimasi: {formatUsageEstimate(usage)}</p>
      <p className={expired ? 'font-medium text-red-400' : 'font-medium text-cyan-400'}>
        <Clock3 className="mr-1 inline h-3 w-3" />
        {remainingSeconds === null
          ? 'Menghitung...'
          : expired
            ? 'Waktu estimasi telah habis'
            : `Sisa waktu: ${days > 0 ? `${days} hari ` : ''}${clock}`}
      </p>
    </div>
  );
}
