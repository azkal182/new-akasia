import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { prisma } from '@/lib/prisma';
import { TransactionType } from '@/generated/prisma/enums';
import moment from 'moment-hijri';
import path from 'path';
import fs from 'fs';

// Hijri months mapping
const hijriMonths = [
    '', 'Muharram', 'Safar', "Rabi'ul Awal", "Rabi'ul Akhir",
    'Jumadal Ula', 'Jumadal Akhirah', 'Rajab', "Sya'ban",
    'Ramadhan', 'Syawwal', "Dzulqa'dah", 'Dzulhijjah'
];

// Helper to convert Hijri date range
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

// Format date to Hijri dd-mm-yyyy
function formatHijriDate(date: Date): string {
    return moment(date).format('iDD-iMM-iYYYY');
}

// Format currency
function formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID').format(amount);
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const hijriYear = parseInt(searchParams.get('year') || moment().format('iYYYY'));
    const hijriMonth = parseInt(searchParams.get('month') || moment().format('iM'));

    const { startDate, endDate } = getHijriMonthRange(hijriYear, hijriMonth);

    // Get opening balance
    const [incomeBefore, expenseBefore] = await Promise.all([
        prisma.transaction.aggregate({
            where: { date: { lt: startDate }, type: TransactionType.INCOME, deletedAt: null },
            _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
            where: { date: { lt: startDate }, type: TransactionType.EXPENSE, deletedAt: null },
            _sum: { amount: true },
        }),
    ]);
    const openingBalance = (incomeBefore._sum.amount ?? 0) - (expenseBefore._sum.amount ?? 0);

    // Get transactions
    const transactions = await prisma.transaction.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
            deletedAt: null,
        },
        orderBy: { date: 'asc' },
        include: {
            income: true,
            expense: {
                include: {
                    items: { include: { car: true } },
                },
            },
        },
    });

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Load watermark image
    let watermarkImage: Buffer | null = null;
    try {
        const watermarkPath = path.join(process.cwd(), 'public', 'watermark.png');
        if (fs.existsSync(watermarkPath)) {
            watermarkImage = fs.readFileSync(watermarkPath);
        }
    } catch (err) {
        console.warn('Failed to load watermark:', err);
    }

    // Function to add watermark to current page
    function addWatermark() {
        if (watermarkImage) {
            const savedY = doc.y;
            // Draw watermark centered, with reduced size for subtle effect
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const watermarkWidth = 420;

            doc.save();
            doc.opacity(0.10);
            doc.image(watermarkImage, (pageWidth - watermarkWidth) / 2, (pageHeight - watermarkWidth) / 2, {
                width: watermarkWidth,
            });
            doc.restore();
            doc.y = savedY;

        }
    }

    // Add watermark to first page
    addWatermark();

    // Header with image
    let headerImageHeight = 0;
    try {
        const headerImagePath = path.join(process.cwd(), 'public', 'header.jpg');
        if (fs.existsSync(headerImagePath)) {
            const headerImage = fs.readFileSync(headerImagePath);
            // Center the header image, full width
            doc.image(headerImage, 40, 40, {
                width: 515,
                align: 'center',
            });
            // Estimate image height based on aspect ratio (header is typically short)
            headerImageHeight = 90; // Approximate height for the header banner
            doc.y = 40 + headerImageHeight + 20; // Set position below image with spacing
        }
    } catch (err) {
        console.warn('Failed to load header image:', err);
    }

    // Title below header image
    doc.fontSize(14).font('Helvetica-Bold').text('Laporan Keuangan', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(11).font('Helvetica').text(`${hijriMonths[hijriMonth]} ${hijriYear}H`, { align: 'center' });
    doc.moveDown(0.8);

    // Table setup
    const tableTop = doc.y;
    const colWidths = [70, 150, 80, 65, 65, 85];
    const headers = ['Tanggal', 'Deskripsi', 'Armada', 'Masuk', 'Keluar', 'Saldo'];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    // Helper to draw cell borders
    function drawCellBorders(startX: number, startY: number, height: number) {
        let cellX = startX;
        for (const width of colWidths) {
            doc.rect(cellX, startY, width, height).stroke();
            cellX += width;
        }
    }

    // Draw header
    let x = 40;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.rect(40, tableTop, tableWidth, 18).fill('#e0e0e0');
    doc.strokeColor('#000000').lineWidth(0.5);
    drawCellBorders(40, tableTop, 18);
    doc.fillColor('#000000');
    x = 40;
    headers.forEach((header, i) => {
        doc.text(header, x + 3, tableTop + 5, { width: colWidths[i] - 6, align: i >= 3 ? 'right' : 'left' });
        x += colWidths[i];
    });

    // Draw rows
    let y = tableTop + 18;
    let runningBalance = openingBalance;
    doc.font('Helvetica').fontSize(8);
    const rowHeight = 16;

    // Opening balance row
    drawCellBorders(40, y, rowHeight);
    doc.text(formatHijriDate(startDate), 43, y + 4, { width: colWidths[0] - 6 });
    doc.text('Saldo Awal', 43 + colWidths[0], y + 4, { width: colWidths[1] - 6 });
    doc.text('-', 43 + colWidths[0] + colWidths[1], y + 4, { width: colWidths[2] - 6 });
    doc.text('-', 43 + colWidths[0] + colWidths[1] + colWidths[2], y + 4, { width: colWidths[3] - 6, align: 'right' });
    doc.text('-', 43 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y + 4, { width: colWidths[4] - 6, align: 'right' });
    doc.text(formatRupiah(openingBalance), 43 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y + 4, { width: colWidths[5] - 6, align: 'right' });
    y += rowHeight;

    // Track receipts for attachment section
    const receipts: { date: Date; total: number; url: string }[] = [];

    for (const trx of transactions) {
        // Collect receipt if expense has one
        if (trx.expense?.receiptUrl) {
            receipts.push({
                date: trx.date,
                total: trx.amount,
                url: trx.expense.receiptUrl,
            });
        }

        // For expenses with items, create separate row for each item
        if (trx.expense?.items && trx.expense.items.length > 0) {
            for (let i = 0; i < trx.expense.items.length; i++) {
                const item = trx.expense.items[i];

                // Only update running balance on first item of transaction
                if (i === 0) {
                    runningBalance -= trx.amount;
                }

                // Check page break
                if (y + rowHeight > 780) {
                    doc.addPage();
                    addWatermark();
                    y = 40;
                    // Redraw header on new page
                    doc.fontSize(9).font('Helvetica-Bold');
                    doc.rect(40, y, tableWidth, 18).fill('#e0e0e0');
                    drawCellBorders(40, y, 18);
                    doc.fillColor('#000000');
                    x = 40;
                    headers.forEach((header, hi) => {
                        doc.text(header, x + 3, y + 5, { width: colWidths[hi] - 6, align: hi >= 3 ? 'right' : 'left' });
                        x += colWidths[hi];
                    });
                    y += 18;
                    doc.font('Helvetica').fontSize(8);
                }

                // Draw row with cell borders
                drawCellBorders(40, y, rowHeight);
                x = 43;

                // Date - show on all rows
                doc.text(formatHijriDate(trx.date), x, y + 4, { width: colWidths[0] - 6 });
                x += colWidths[0];

                // Description: item name with quantity
                doc.text(`${item.description} (x${item.quantity})`, x, y + 4, { width: colWidths[1] - 6 });
                x += colWidths[1];

                // Car name
                doc.text(item.car?.name || '-', x, y + 4, { width: colWidths[2] - 6 });
                x += colWidths[2];

                // Masuk (empty for expense)
                doc.text('-', x, y + 4, { width: colWidths[3] - 6, align: 'right' });
                x += colWidths[3];

                // Keluar: show item total
                doc.text(formatRupiah(item.total), x, y + 4, { width: colWidths[4] - 6, align: 'right' });
                x += colWidths[4];

                // Saldo - show on all rows
                doc.text(formatRupiah(runningBalance), x, y + 4, { width: colWidths[5] - 6, align: 'right' });

                y += rowHeight;
            }
        } else {
            // Income or expense without items
            const description = trx.income?.source || trx.description;

            // Update running balance
            if (trx.type === TransactionType.INCOME) {
                runningBalance += trx.amount;
            } else {
                runningBalance -= trx.amount;
            }

            // Check page break
            if (y + rowHeight > 780) {
                doc.addPage();
                addWatermark();
                y = 40;
                doc.fontSize(9).font('Helvetica-Bold');
                doc.rect(40, y, tableWidth, 18).fill('#e0e0e0');
                drawCellBorders(40, y, 18);
                doc.fillColor('#000000');
                x = 40;
                headers.forEach((header, hi) => {
                    doc.text(header, x + 3, y + 5, { width: colWidths[hi] - 6, align: hi >= 3 ? 'right' : 'left' });
                    x += colWidths[hi];
                });
                y += 18;
                doc.font('Helvetica').fontSize(8);
            }

            // Draw row
            drawCellBorders(40, y, rowHeight);
            x = 43;
            doc.text(formatHijriDate(trx.date), x, y + 4, { width: colWidths[0] - 6 });
            x += colWidths[0];
            doc.text(description, x, y + 4, { width: colWidths[1] - 6 });
            x += colWidths[1];
            doc.text('-', x, y + 4, { width: colWidths[2] - 6 });
            x += colWidths[2];

            if (trx.type === TransactionType.INCOME) {
                doc.text(formatRupiah(trx.amount), x, y + 4, { width: colWidths[3] - 6, align: 'right' });
                x += colWidths[3];
                doc.text('-', x, y + 4, { width: colWidths[4] - 6, align: 'right' });
            } else {
                doc.text('-', x, y + 4, { width: colWidths[3] - 6, align: 'right' });
                x += colWidths[3];
                doc.text(formatRupiah(trx.amount), x, y + 4, { width: colWidths[4] - 6, align: 'right' });
            }
            x += colWidths[4];
            doc.text(formatRupiah(runningBalance), x, y + 4, { width: colWidths[5] - 6, align: 'right' });

            y += rowHeight;
        }
    }

    // Section 2: Receipt Attachments (new page)
    if (receipts.length > 0) {
        doc.addPage();
        addWatermark();
        doc.fontSize(16).font('Helvetica-Bold').text('Lampiran Nota', { align: 'center' });
        doc.moveDown(1.5);

        const maxImageWidth = 250;
        const maxImageHeight = 320;
        const pageWidth = 515;
        let imageCount = 0;

        for (const receipt of receipts) {
            // Check if need new page (2 images per page)
            if (imageCount >= 2) {
                doc.addPage();
                addWatermark();
                doc.fontSize(16).font('Helvetica-Bold').text('Lampiran Nota', { align: 'center' });
                doc.moveDown(1.5);
                imageCount = 0;
            }

            // Date and total - centered
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text(`Tanggal: ${formatHijriDate(receipt.date)}`, { align: 'center' });
            doc.fontSize(10).font('Helvetica');
            doc.text(`Total: Rp ${formatRupiah(receipt.total)}`, { align: 'center' });
            doc.moveDown(0.5);

            // Try to fetch and embed image
            try {
                const imageResponse = await fetch(receipt.url);
                if (imageResponse.ok) {
                    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
                    // Calculate center position for image
                    const imageX = 40 + (pageWidth - maxImageWidth) / 2;
                    doc.image(imageBuffer, imageX, doc.y, {
                        fit: [maxImageWidth, maxImageHeight],
                        align: 'center',
                    });
                    doc.y += maxImageHeight + 10;
                } else {
                    doc.fontSize(9).font('Helvetica').text(`[Gambar tidak tersedia]`, { align: 'center' });
                    doc.moveDown(2);
                }
            } catch {
                doc.fontSize(9).font('Helvetica').text(`[Gagal memuat gambar]`, { align: 'center' });
                doc.moveDown(2);
            }

            doc.moveDown(1);
            imageCount++;
        }
    }

    doc.end();

    // Wait for PDF to complete
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
        doc.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Laporan-Keuangan-${hijriMonths[hijriMonth]}-${hijriYear}.pdf"`,
        },
    });
}
