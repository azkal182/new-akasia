import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import moment from 'moment-hijri';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma';

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
  return moment(date).format('iDD-iMM-iYYYY');
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const hijriYear = parseInt(searchParams.get('year') || moment().format('iYYYY'));
  const hijriMonth = parseInt(searchParams.get('month') || moment().format('iM'));
  const carId = searchParams.get('carId') || undefined;

  const { startDate, endDate } = getHijriMonthRange(hijriYear, hijriMonth);

  const where: Record<string, unknown> = {
    startTime: { gte: startDate, lte: endDate },
  };

  if (carId) {
    where.carId = carId;
  }

  const [records, selectedCar] = await Promise.all([
    prisma.usageRecord.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        car: { select: { id: true, name: true, licensePlate: true } },
        user: { select: { id: true, name: true } },
      },
    }),
    carId
      ? prisma.car.findUnique({
          where: { id: carId },
          select: { name: true, licensePlate: true },
        })
      : Promise.resolve(null),
  ]);

  const totalTrips = records.length;
  const completedTrips = records.filter((r) => r.endTime !== null).length;
  const ongoingTrips = records.filter((r) => r.endTime === null).length;
  const uniqueCars = new Set(records.map((r) => r.carId)).size;
  const uniqueDrivers = new Set(records.map((r) => r.userId)).size;

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

  let headerImageHeight = 0;
  try {
    const headerImagePath = path.join(process.cwd(), 'public', 'header.jpg');
    if (fs.existsSync(headerImagePath)) {
      const headerImage = fs.readFileSync(headerImagePath);
      doc.image(headerImage, 40, 40, {
        width: 515,
        align: 'center',
      });
      headerImageHeight = 90;
      doc.y = 40 + headerImageHeight + 20;
    }
  } catch (err) {
    console.warn('Failed to load header image:', err);
  }

  doc.fontSize(14).font('Helvetica-Bold').text('Laporan Riwayat Armada', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(11).font('Helvetica').text(`${hijriMonths[hijriMonth]} ${hijriYear}H`, { align: 'center' });
  if (selectedCar) {
    const carLabel = `${selectedCar.name}${selectedCar.licensePlate ? ` (${selectedCar.licensePlate})` : ''}`;
    doc.fontSize(10).font('Helvetica').text(`Kendaraan: ${carLabel}`, { align: 'center' });
  } else {
    doc.fontSize(10).font('Helvetica').text('Kendaraan: Semua', { align: 'center' });
  }
  doc.moveDown(0.8);

  const tableTop = doc.y;
  const colWidths = [70, 140, 90, 125, 90];
  const headers = ['Tanggal', 'Kendaraan', 'Driver', 'Tujuan', 'Keperluan'];
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
        align: 'left',
      });
      x += colWidths[i];
    });
  }

  drawTableHeader(tableTop);

  let y = tableTop + 18;
  const rowHeight = 16;
  doc.font('Helvetica').fontSize(8);

  for (const record of records) {
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

    doc.text(formatHijriDate(record.startTime), x, y + 4, { width: colWidths[0] - 6 });
    x += colWidths[0];

    const carText = truncateText(
      `${record.car.name}${record.car.licensePlate ? ` (${record.car.licensePlate})` : ''}`,
      24
    );
    doc.text(carText, x, y + 4, { width: colWidths[1] - 6 });
    x += colWidths[1];

    const driverText = truncateText(record.user?.name || '-', 16);
    doc.text(driverText, x, y + 4, { width: colWidths[2] - 6 });
    x += colWidths[2];

    const destinationText = truncateText(record.destination || '-', 20);
    doc.text(destinationText, x, y + 4, { width: colWidths[3] - 6 });
    x += colWidths[3];

    const purposeText = truncateText(record.purpose || '-', 18);
    doc.text(purposeText, x, y + 4, { width: colWidths[4] - 6 });

    y += rowHeight;
  }

  doc.end();

  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Laporan-Armada-${hijriMonths[hijriMonth]}-${hijriYear}.pdf"`,
    },
  });
}
