import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import moment from 'moment-hijri';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma';
import { TransactionLedger, TransactionType } from '@/generated/prisma/enums';

const DEBUG_PREFIX = '[reports/fuel]';

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

function getHijriMonthRange(hijriYear: number, hijriMonth: number) {
  try {
    const startStr = `${hijriYear}/${hijriMonth}/1`;
    const startHijri = moment(startStr, 'iYYYY/iM/iD');

    let nextMonth = hijriMonth + 1;
    let nextYear = hijriYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    const endStr = `${nextYear}/${nextMonth}/1`;
    const endHijri = moment(endStr, 'iYYYY/iM/iD').subtract(1, 'day').endOf('day');

    return { startDate: startHijri.toDate(), endDate: endHijri.toDate() };
  } catch {
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
}

function formatHijriDate(date: Date): string {
  // Database timestamps are UTC; reports use the application's Jakarta date.
  // Build the date from numeric Hijri getters because moment-hijri's iDD/iMM/iYYYY
  // format emits Arabic-Indic numerals that PDFKit's Helvetica font cannot render.
  const localDate = moment(date).utcOffset(7);
  const pad = (value: number) => value.toString().padStart(2, '0');

  return `${pad(localDate.iDate())}/${pad(localDate.iMonth() + 1)}/${localDate.iYear()}`;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

function formatLiter(amount: number): string {
  if (!amount || Number.isNaN(amount)) {
    return '-';
  }
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function truncateText(value: string, maxLength: number) {
  if (!value) {
    return '-';
  }
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function formatFuelType(type: string) {
  return type === 'BENSIN' ? 'Bensin' : 'Solar';
}

type ReceiptMeta = { date: Date; total: number; url: string; car: string };
type ReceiptResult = {
  receipt: ReceiptMeta;
  ok: boolean;
  buffer?: Buffer;
  status?: number;
  error?: unknown;
};

async function prefetchReceipts(receipts: ReceiptMeta[], concurrency: number) {
  const results: ReceiptResult[] = new Array(receipts.length);
  let index = 0;

  async function worker() {
    while (true) {
      const currentIndex = index++;
      if (currentIndex >= receipts.length) {
        break;
      }
      const receipt = receipts[currentIndex];
      try {
        console.log(`${DEBUG_PREFIX} fetching receipt`, receipt.url);
        const response = await fetch(receipt.url);
        if (!response.ok) {
          console.warn(`${DEBUG_PREFIX} receipt fetch failed`, receipt.url, response.status);
          results[currentIndex] = { receipt, ok: false, status: response.status };
          continue;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        results[currentIndex] = { receipt, ok: true, buffer };
      } catch (err) {
        console.warn(`${DEBUG_PREFIX} receipt fetch error`, receipt.url, err);
        results[currentIndex] = { receipt, ok: false, error: err };
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, receipts.length));
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Generate a fuel (BBM) report PDF for the given Hijri month and return a Buffer.
 */
export async function generateFuelPdf(
  hijriYear: number,
  hijriMonth: number,
  carId?: string,
): Promise<Buffer> {
  const startedAt = Date.now();
  console.log(
    `${DEBUG_PREFIX} start`,
    JSON.stringify({ hijriYear, hijriMonth, carId })
  );

  const { startDate, endDate } = getHijriMonthRange(hijriYear, hijriMonth);

  const fuelWhere: Record<string, unknown> = {
    transaction: {
      type: TransactionType.FUEL_PURCHASE,
      ledger: TransactionLedger.FUEL,
      date: { gte: startDate, lte: endDate },
      deletedAt: null,
    },
  };
  if (carId) {
    fuelWhere.carId = carId;
  }

  const [purchases, incomeTotal, openingIncome, openingExpense, selectedCar] = await Promise.all([
    prisma.fuelPurchase.findMany({
      where: fuelWhere,
      orderBy: { transaction: { date: 'asc' } },
      include: {
        car: { select: { id: true, name: true, licensePlate: true } },
        transaction: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    }),
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.INCOME,
        ledger: TransactionLedger.FUEL,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.INCOME,
        ledger: TransactionLedger.FUEL,
        date: { lt: startDate },
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.FUEL_PURCHASE,
        ledger: TransactionLedger.FUEL,
        date: { lt: startDate },
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
    carId
      ? prisma.car.findUnique({
          where: { id: carId },
          select: { name: true, licensePlate: true },
        })
      : Promise.resolve(null),
  ]);

  console.log(
    `${DEBUG_PREFIX} query done`,
    JSON.stringify({
      purchases: purchases.length,
      totalIncome: incomeTotal._sum.amount ?? 0,
      selectedCar: selectedCar ? `${selectedCar.name}` : null,
    })
  );

  const totalPurchases = purchases.length;
  const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalIncome = incomeTotal._sum.amount ?? 0;
  const openingBalance =
    (openingIncome._sum.amount ?? 0) - (openingExpense._sum.amount ?? 0);
  const balance = totalIncome - totalAmount;
  const closingBalance = openingBalance + balance;
  const uniqueCars = new Set(purchases.map((p) => p.carId)).size;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  let watermarkImage: Buffer | null = null;
  try {
    const watermarkPath = path.join(process.cwd(), 'public', 'watermark.png');
    if (fs.existsSync(watermarkPath)) {
      watermarkImage = fs.readFileSync(watermarkPath);
    }
  } catch (err) {
    console.warn('Failed to load watermark:', err);
  }

  function addWatermark() {
    if (watermarkImage) {
      const savedY = doc.y;
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const watermarkWidth = 420;

      doc.save();
      doc.opacity(0.1);
      doc.image(
        watermarkImage,
        (pageWidth - watermarkWidth) / 2,
        (pageHeight - watermarkWidth) / 2,
        { width: watermarkWidth }
      );
      doc.restore();
      doc.y = savedY;
    }
  }

  addWatermark();

  try {
    const headerImagePath = path.join(process.cwd(), 'public', 'header.jpg');
    if (fs.existsSync(headerImagePath)) {
      const headerImage = fs.readFileSync(headerImagePath);
      doc.image(headerImage, 40, 40, { width: 515, align: 'center' });
      const headerImageHeight = 90;
      doc.y = 40 + headerImageHeight + 20;
    }
  } catch (err) {
    console.warn('Failed to load header image:', err);
  }

  doc.fontSize(14).font('Helvetica-Bold').text('Laporan BBM', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(11).font('Helvetica').text(`${hijriMonths[hijriMonth]} ${hijriYear}H`, {
    align: 'center',
  });
  if (selectedCar) {
    const carLabel = `${selectedCar.name}${selectedCar.licensePlate ? ` (${selectedCar.licensePlate})` : ''}`;
    doc.fontSize(10).font('Helvetica').text(`Kendaraan: ${carLabel}`, { align: 'center' });
  } else {
    doc.fontSize(10).font('Helvetica').text('Kendaraan: Semua', { align: 'center' });
  }
  doc.moveDown(0.8);

  const isCarFiltered = Boolean(carId);
  const condition =
    balance > 0
      ? 'Terdapat sisa dana'
      : balance < 0
        ? 'Terdapat kekurangan dana'
        : 'Seimbang';
  const netLabel =
    balance > 0 ? 'Sisa dana' : balance < 0 ? 'Kekurangan dana' : 'Selisih bersih';

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(isCarFiltered ? 'Ringkasan Pengeluaran Kendaraan' : 'Ringkasan Kondisi Keuangan', 40);
  doc.moveDown(0.3);

  const summaryTop = doc.y;
  const summaryCellWidth = 171.67;
  const summaryCellHeight = 38;
  const summaryRows: [string, string][][] = isCarFiltered
    ? [
        [
          ['Jumlah dana keluar', `Rp ${formatRupiah(totalAmount)}`],
          ['Jumlah transaksi', String(totalPurchases)],
          ['Objek laporan', 'Kendaraan'],
        ],
        [
          ['Periode laporan', `${hijriMonths[hijriMonth]} ${hijriYear}H`],
          ['Jenis laporan', 'Pengeluaran BBM'],
          ['Saldo kas', 'Tidak berlaku'],
        ],
      ]
    : [
        [
          ['Saldo bulan lalu', `Rp ${formatRupiah(openingBalance)}`],
          ['Jumlah dana masuk', `Rp ${formatRupiah(totalIncome)}`],
          ['Jumlah dana keluar', `Rp ${formatRupiah(totalAmount)}`],
        ],
        [
          [netLabel, `Rp ${formatRupiah(Math.abs(balance))}`],
          ['Saldo akhir', `Rp ${formatRupiah(closingBalance)}`],
          ['Kondisi bulan ini', condition],
        ],
      ];

  summaryRows.forEach((row, rowIndex) => {
    row.forEach(([label, value], columnIndex) => {
      const cellX = 40 + columnIndex * summaryCellWidth;
      const cellY = summaryTop + rowIndex * summaryCellHeight;
      const isConditionCell = label === 'Kondisi bulan ini';
      const isNegative =
        label === 'Kekurangan dana' ||
        (isConditionCell && condition === 'Terdapat kekurangan dana');
      const isPositive =
        label === 'Sisa dana' ||
        (isConditionCell && condition === 'Terdapat sisa dana');

      doc
        .lineWidth(0.5)
        .fillColor(isNegative ? '#fef2f2' : isPositive ? '#f0fdf4' : '#f8fafc')
        .strokeColor('#cbd5e1')
        .rect(cellX, cellY, summaryCellWidth, summaryCellHeight)
        .fillAndStroke();
      doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(label, cellX + 8, cellY + 7, {
        width: summaryCellWidth - 16,
      });
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(isNegative ? '#b91c1c' : isPositive ? '#15803d' : '#0f172a')
        .text(value, cellX + 8, cellY + 20, {
          width: summaryCellWidth - 16,
          align: 'right',
        });
    });
  });

  doc.fillColor('#000000').moveDown(3.1);
  doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(
    `Jumlah transaksi BBM: ${totalPurchases} | Kendaraan yang digunakan: ${uniqueCars}`,
    40,
  );
  doc.fillColor('#000000').moveDown(0.8);

  const tableTop = doc.y;
  const colWidths = [70, 150, 80, 60, 70, 85];
  const headers = ['Tanggal', 'Kendaraan', 'User', 'Liter', 'Total', 'Catatan'];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  function drawCellBorders(startX: number, startY: number, height: number) {
    let cellX = startX;
    for (const width of colWidths) {
      doc.rect(cellX, startY, width, height).stroke();
      cellX += width;
    }
  }

  function drawTableHeader(startY: number) {
    let x = 40;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.rect(40, startY, tableWidth, 18).fill('#e0e0e0');
    doc.strokeColor('#000000').lineWidth(0.5);
    drawCellBorders(40, startY, 18);
    doc.fillColor('#000000');
    headers.forEach((header, i) => {
      doc.text(header, x + 3, startY + 5, {
        width: colWidths[i] - 6,
        align: i >= 3 ? 'right' : 'left',
      });
      x += colWidths[i];
    });
  }

  drawTableHeader(tableTop);

  let y = tableTop + 18;
  const rowHeight = 16;
  doc.font('Helvetica').fontSize(8);

  const receipts: ReceiptMeta[] = [];

  for (const purchase of purchases) {
    const transactionDate = purchase.transaction?.date ?? purchase.createdAt;

    if (purchase.receiptUrl) {
      const carLabel = `${purchase.car.name}${purchase.car.licensePlate ? ` (${purchase.car.licensePlate})` : ''}`;
      receipts.push({
        date: transactionDate,
        total: purchase.totalAmount,
        url: purchase.receiptUrl,
        car: carLabel,
      });
    }

    if (y + rowHeight > 780) {
      doc.addPage();
      addWatermark();
      y = 40;
      drawTableHeader(y);
      y += 18;
      doc.font('Helvetica').fontSize(8);
    }

    drawCellBorders(40, y, rowHeight);
    let x = 43;

    doc.text(formatHijriDate(transactionDate), x, y + 4, { width: colWidths[0] - 6 });
    x += colWidths[0];

    const carText = truncateText(
      `${purchase.car.name}${purchase.car.licensePlate ? ` (${purchase.car.licensePlate})` : ''}`,
      24
    );
    doc.text(carText, x, y + 4, { width: colWidths[1] - 6 });
    x += colWidths[1];

    const userText = truncateText(purchase.transaction?.user?.name || '-', 14);
    doc.text(userText, x, y + 4, { width: colWidths[2] - 6 });
    x += colWidths[2];

    doc.text(formatLiter(purchase.literAmount), x, y + 4, {
      width: colWidths[3] - 6,
      align: 'right',
    });
    x += colWidths[3];

    doc.text(formatRupiah(purchase.totalAmount), x, y + 4, {
      width: colWidths[4] - 6,
      align: 'right',
    });
    x += colWidths[4];

    const noteParts = [formatFuelType(purchase.fuelType)];
    if (purchase.notes) {
      noteParts.push(purchase.notes);
    }
    const noteText = truncateText(noteParts.join(' - '), 22);
    doc.text(noteText, x, y + 4, { width: colWidths[5] - 6 });

    y += rowHeight;
  }

  if (receipts.length > 0) {
    const receiptResults = await prefetchReceipts(receipts, 3);

    doc.addPage();
    addWatermark();
    doc.fontSize(16).font('Helvetica-Bold').text('Lampiran Nota BBM', { align: 'center' });
    doc.moveDown(1.5);

    const maxImageWidth = 250;
    const maxImageHeight = 320;
    const pageWidth = 515;
    let imageCount = 0;

    for (const result of receiptResults) {
      const receipt = result.receipt;
      if (imageCount >= 2) {
        doc.addPage();
        addWatermark();
        doc.fontSize(16).font('Helvetica-Bold').text('Lampiran Nota BBM', { align: 'center' });
        doc.moveDown(1.5);
        imageCount = 0;
      }

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Tanggal: ${formatHijriDate(receipt.date)}`, { align: 'center' });
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total: Rp ${formatRupiah(receipt.total)}`, { align: 'center' });
      doc.text(`Kendaraan: ${receipt.car}`, { align: 'center' });
      doc.moveDown(0.5);

      if (result.ok && result.buffer) {
        const imageX = 40 + (pageWidth - maxImageWidth) / 2;
        doc.image(result.buffer, imageX, doc.y, {
          fit: [maxImageWidth, maxImageHeight],
          align: 'center',
        });
        doc.y += maxImageHeight + 10;
      } else {
        doc.fontSize(9).font('Helvetica').text('[Gambar tidak tersedia]', { align: 'center' });
        doc.moveDown(2);
      }

      doc.moveDown(1);
      imageCount++;
    }
  }

  doc.end();

  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });

  console.log(
    `${DEBUG_PREFIX} done`,
    JSON.stringify({ bytes: pdfBuffer.length, ms: Date.now() - startedAt })
  );

  return pdfBuffer;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const hijriYear = parseInt(searchParams.get('year') || moment().format('iYYYY'));
  const hijriMonth = parseInt(searchParams.get('month') || moment().format('iM'));
  const carId = searchParams.get('carId') || undefined;

  const pdfBuffer = await generateFuelPdf(hijriYear, hijriMonth, carId);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Laporan-BBM-${hijriMonths[hijriMonth]}-${hijriYear}.pdf"`,
    },
  });
}
