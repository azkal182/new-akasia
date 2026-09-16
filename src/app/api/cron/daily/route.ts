import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { sendTelegramMessage } from "@/lib/telegram";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

function getJakartaDayStart(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
  ));
}

function parseDateParameter(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  return isValidDate ? parsed : undefined;
}

function formatJakartaDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getNotificationKey(daysUntilDue: number) {
  if (daysUntilDue < 0) return "OVERDUE";
  if (daysUntilDue === 0) return "DUE_TODAY";
  if (daysUntilDue === 1) return "DUE_IN_1";
  if (daysUntilDue === 3) return "DUE_IN_3";
  if (daysUntilDue === 7) return "DUE_IN_7";
  if (daysUntilDue === 10) return "DUE_IN_10";
  return null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET(request: NextRequest) {
  try {
    // `date` is intentionally used only as the tax notification reference
    // date, making historical/future notification testing possible without
    // changing the server clock or other daily processes.
    const dateParameter = request.nextUrl.searchParams.get("date");
    const requestedTaxDate = parseDateParameter(dateParameter);
    if (dateParameter && !requestedTaxDate) {
      return NextResponse.json(
        { error: "Parameter date harus berformat YYYY-MM-DD dan merupakan tanggal valid" },
        { status: 400 },
      );
    }

    const todayStart = requestedTaxDate ?? getJakartaDayStart(new Date());

    // Process upcoming taxes (due in <= 10 days).
    const tenDaysFromNow = addDays(todayStart, 10);

    // Taxes that are not paid and the due date is <= 10 days from today
    // We also want to include overdue taxes if they haven't been paid.
    const upcomingTaxes = await prisma.tax.findMany({
      where: {
        isPaid: false,
        dueDate: {
          lte: tenDaysFromNow,
        },
      },
      include: {
        car: { select: { id: true, name: true, licensePlate: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    // We can format the taxes to be more readable for the notification payload
    const taxAlerts = upcomingTaxes.map((tax) => {
      const daysUntilDue = Math.floor(
        (getJakartaDayStart(tax.dueDate).getTime() - todayStart.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const isOverdue = daysUntilDue < 0;

      return {
        id: tax.id,
        carName: tax.car.name,
        licensePlate: tax.car.licensePlate,
        type: tax.type,
        dueDate: tax.dueDate,
        daysUntilDue,
        isOverdue,
        notificationKey: getNotificationKey(daysUntilDue),
        lastNotificationKey: tax.lastNotificationKey,
      };
    });

    const notifications = taxAlerts.filter(
      (tax) => tax.notificationKey && tax.notificationKey !== tax.lastNotificationKey,
    );

    let notificationSent = false;
    if (notifications.length > 0) {
      const overdue = notifications.filter((tax) => tax.isOverdue);
      const upcoming = notifications.filter((tax) => !tax.isOverdue);
      const lines = [
        "<b>LAPORAN PENGINGAT PAJAK KENDARAAN</b>",
        `Tanggal acuan: ${formatJakartaDate(todayStart)}`,
        `Jumlah pemberitahuan: ${notifications.length}`,
        "",
      ];

      if (overdue.length > 0) {
        lines.push(`<b>A. PAJAK TELAH JATUH TEMPO (${overdue.length})</b>`);
        overdue.forEach((tax, index) => {
          lines.push(
            `${index + 1}. <b>${escapeHtml(tax.carName)}</b>\n` +
            `   Nomor polisi: ${escapeHtml(tax.licensePlate ?? "-")}\n` +
            `   Jenis pajak: ${escapeHtml(tax.type === "FIVE_YEAR" ? "STNK 5 Tahunan" : "Pajak Tahunan")}\n` +
            `   Jatuh tempo: ${formatJakartaDate(tax.dueDate)}\n` +
            `   Keterlambatan: ${Math.abs(tax.daysUntilDue)} hari`,
          );
        });
        lines.push("");
      }

      if (upcoming.length > 0) {
        lines.push(`<b>B. PAJAK AKAN JATUH TEMPO (${upcoming.length})</b>`);
        upcoming.forEach((tax, index) => {
          lines.push(
            `${index + 1}. <b>${escapeHtml(tax.carName)}</b>\n` +
            `   Nomor polisi: ${escapeHtml(tax.licensePlate ?? "-")}\n` +
            `   Jenis pajak: ${escapeHtml(tax.type === "FIVE_YEAR" ? "STNK 5 Tahunan" : "Pajak Tahunan")}\n` +
            `   Jatuh tempo: ${formatJakartaDate(tax.dueDate)}\n` +
            `   Status: ${tax.daysUntilDue === 0 ? "Jatuh tempo hari ini" : `${tax.daysUntilDue} hari lagi`}`,
          );
        });
        lines.push("");
      }

      lines.push("Mohon dilakukan tindak lanjut sesuai ketentuan yang berlaku.");

      const telegramResult = await sendTelegramMessage(lines.join("\n"), "HTML");
      if (!telegramResult.success) {
        throw new Error(telegramResult.error ?? "Gagal mengirim notifikasi Telegram");
      }

      await prisma.$transaction(
        notifications.map((tax) => prisma.tax.update({
          where: { id: tax.id },
          data: { lastNotificationKey: tax.notificationKey },
        })),
      );
      notificationSent = true;
    }

    return NextResponse.json({
      success: true,
      data: {
        upcomingTaxesCount: taxAlerts.length,
        upcomingTaxes: taxAlerts,
        notification: {
          sent: notificationSent,
          count: notifications.length,
        },
        taxReferenceDate: todayStart.toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    console.error("Failed to run daily cron:", error);
    return NextResponse.json(
      { error: "Internal server error while running cron" },
      { status: 500 },
    );
  }
}
