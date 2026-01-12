'use client';

import { useState, useEffect } from 'react';
import moment from 'moment-hijri';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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

interface HijriMonthSelectProps {
  onMonthChange: (year: number, month: number) => void;
  defaultYear?: number;
  defaultMonth?: number;
}

export function HijriMonthSelect({ onMonthChange, defaultYear, defaultMonth }: HijriMonthSelectProps) {
  const currentHijriYear = moment().iYear();
  const currentHijriMonth = moment().iMonth() + 1;

  const [year, setYear] = useState(defaultYear ?? currentHijriYear);
  const [month, setMonth] = useState(defaultMonth ?? currentHijriMonth);

  // Generate years from current - 5 to current + 1
  const years = Array.from({ length: 7 }, (_, i) => currentHijriYear - 5 + i);

  useEffect(() => {
    onMonthChange(year, month);
  }, [year, month, onMonthChange]);

  return (
    <div className="flex items-center gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-neutral-500">Tahun Hijri</Label>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-24 border-neutral-700 bg-neutral-800/50 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-neutral-700 bg-neutral-900">
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-neutral-500">Bulan Hijri</Label>
        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-40 border-neutral-700 bg-neutral-800/50 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-neutral-700 bg-neutral-900">
            {hijriMonths.map((m) => (
              <SelectItem key={m.value} value={m.value.toString()}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function getHijriMonthRange(hijriYear: number, hijriMonth: number) {
  const startHijri = moment(`${hijriYear}-${hijriMonth}-01`, 'iYYYY-iM-iD');
  const endHijri = startHijri.clone().endOf('iMonth');

  return {
    startDate: startHijri.toDate(),
    endDate: endHijri.toDate(),
    monthName: hijriMonths.find((m) => m.value === hijriMonth)?.label ?? '',
  };
}
