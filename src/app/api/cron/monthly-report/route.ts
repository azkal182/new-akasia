import { NextRequest, NextResponse } from 'next/server';
import moment from 'moment-hijri';
import { generateFinancePdf } from '@/app/api/reports/finance/route';
import { generateCarsPdf } from '@/app/api/reports/cars/route';
import { generateFuelPdf } from '@/app/api/reports/fuel/route';
import { sendTelegramMessage, sendTelegramDocument } from '@/lib/telegram';

const hijriMonths = [
  '',
  'Muharram',
  'Safar',
  "Rabi'ul Awal",
  "Rabi'ul Akhir",
  'Jumadal Ula',
  'Jumadal Akhirah',
  'Rajab',
  "Sya'ban",
  'Ramadhan',
  'Syawwal',
  "Dzulqa'dah",
  'Dzulhijjah',
];

const JAKARTA_TIME_ZONE = 'Asia/Jakarta';

function parseDateParameter(value: string | null): Date | null | undefined {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  return isValidDate ? parsed : undefined;
}

/**
 * Check whether today is the last day of the current Hijri month.
 */
function isLastDayOfHijriMonth(referenceDate: Date | null): { isLast: boolean; hijriYear: number; hijriMonth: number; hijriDay: number } {
  const now = referenceDate ? moment.utc(referenceDate).utcOffset(7) : moment().utcOffset(7);
  const hijriYear = now.iYear();
  const hijriMonth = now.iMonth() + 1; // 1-indexed
  const hijriDay = now.iDate();

  // Determine last day by moving to day 1 of next month and subtracting 1 day
  let nextMonth = hijriMonth + 1; // still 1-indexed
  let nextYear = hijriYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }

  // Build start of next month then subtract 1 day → last day of current month
  const startOfNextMonth = moment(`${nextYear}/${nextMonth}/1`, 'iYYYY/iM/iD');
  const lastDayOfMonth = startOfNextMonth.subtract(1, 'day').iDate();

  return {
    isLast: hijriDay >= lastDayOfMonth,
    hijriYear,
    hijriMonth,
    hijriDay,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const force = searchParams.get('force') === 'true';
  const dateParameter = searchParams.get('date');
  const requestedDate = parseDateParameter(dateParameter);

  if (dateParameter && !requestedDate) {
    return NextResponse.json(
      { error: 'Parameter date harus berformat YYYY-MM-DD dan merupakan tanggal valid' },
      { status: 400 },
    );
  }

  const effectiveRequestedDate: Date | null = requestedDate ?? null;
  const { isLast, hijriYear, hijriMonth, hijriDay } = isLastDayOfHijriMonth(effectiveRequestedDate);
  const monthName = hijriMonths[hijriMonth];
  const referenceDate = effectiveRequestedDate ?? new Date();
  const todayGregorian = referenceDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: JAKARTA_TIME_ZONE,
  });

  if (!isLast && !force) {
    console.log(
      `[cron/monthly-report] Skipped. Today is ${hijriDay} ${monthName} ${hijriYear}H — not the last day.`
    );
    return NextResponse.json({
      skipped: true,
      reason: `Today (${hijriDay} ${monthName} ${hijriYear}H) is not the last day of the Hijri month.`,
    });
  }

  console.log(
    `[cron/monthly-report] Running for ${monthName} ${hijriYear}H (force=${force})`
  );

  try {
    // Generate all 3 PDFs in parallel
    const [financePdf, carsPdf, fuelPdf] = await Promise.all([
      generateFinancePdf(hijriYear, hijriMonth),
      generateCarsPdf(hijriYear, hijriMonth),
      generateFuelPdf(hijriYear, hijriMonth),
    ]);

    console.log(`[cron/monthly-report] All PDFs generated. Sending to Telegram...`);

    // Opening message
    const openingMessage =
      `📋 *Laporan Bulanan — ${monthName} ${hijriYear}H*\n\n` +
      `Berikut adalah laporan keuangan dan operasional bulan *${monthName} ${hijriYear} Hijriah*.\n\n` +
      `📅 Dikirim otomatis pada: ${todayGregorian}`;

    await sendTelegramMessage(openingMessage);

    // --- Laporan 1: Keuangan ---
    const financeCaption =
      `📊 *Laporan Keuangan — ${monthName} ${hijriYear}H*\n\n` +
      `Berisi ringkasan pemasukan, pengeluaran, dan saldo kas bulan ${monthName} ${hijriYear} Hijriah beserta lampiran nota pengeluaran.\n\n` +
      `_Dihasilkan otomatis pada ${todayGregorian}_`;

    await sendTelegramDocument(
      financePdf,
      `Laporan-Keuangan-${monthName}-${hijriYear}H.pdf`,
      financeCaption
    );

    // --- Laporan 2: Riwayat Armada ---
    const carsCaption =
      `🚗 *Laporan Riwayat Armada — ${monthName} ${hijriYear}H*\n\n` +
      `Berisi rekapitulasi penggunaan seluruh kendaraan operasional selama bulan ${monthName} ${hijriYear} Hijriah.\n\n` +
      `_Dihasilkan otomatis pada ${todayGregorian}_`;

    await sendTelegramDocument(
      carsPdf,
      `Laporan-Armada-${monthName}-${hijriYear}H.pdf`,
      carsCaption
    );

    // --- Laporan 3: BBM ---
    const fuelCaption =
      `⛽ *Laporan BBM — ${monthName} ${hijriYear}H*\n\n` +
      `Berisi rekapitulasi pengisian bahan bakar (bensin & solar) seluruh armada beserta lampiran struk BBM selama bulan ${monthName} ${hijriYear} Hijriah.\n\n` +
      `_Dihasilkan otomatis pada ${todayGregorian}_`;

    await sendTelegramDocument(
      fuelPdf,
      `Laporan-BBM-${monthName}-${hijriYear}H.pdf`,
      fuelCaption
    );

    // Closing message
    await sendTelegramMessage(
      `✅ Semua laporan bulan *${monthName} ${hijriYear}H* telah berhasil dikirim.\n\n` +
      `Total ${3} file laporan terkirim.`
    );

    console.log(`[cron/monthly-report] Done. All reports sent to Telegram.`);

    return NextResponse.json({
      success: true,
      month: monthName,
      hijriYear,
      hijriMonth,
      reportsSent: ['finance', 'cars', 'fuel'],
      sentAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[cron/monthly-report] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
