import { prisma } from '@/lib/prisma';
import {
    formatVehicleUsageStartedMessage,
    sendWhatsApp,
} from '@/lib/whatsapp';

const JAKARTA_TIME_ZONE = 'Asia/Jakarta';

function getJakartaDateKey(date: Date) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: JAKARTA_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

function getJakartaDayRange(date: Date) {
    const dateKey = getJakartaDateKey(date);
    const start = new Date(`${dateKey}T00:00:00+07:00`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return { start, end };
}

export async function notifyVehicleUsageStarted(recordId: string) {
    const record = await prisma.usageRecord.findUnique({
        where: { id: recordId },
        select: { startTime: true },
    });

    if (!record) return;

    const { start, end } = getJakartaDayRange(record.startTime);
    const records = await prisma.usageRecord.findMany({
        where: {
            startTime: { gte: start, lt: end },
        },
        orderBy: { startTime: 'asc' },
        select: {
            startTime: true,
            purpose: true,
            destination: true,
            estimatedDurationMinutes: true,
            car: { select: { name: true, licensePlate: true } },
            user: { select: { name: true, username: true } },
        },
    });

    const message = formatVehicleUsageStartedMessage(records);
    if (!message) return;

    const recipient = process.env.WA_USAGE_RECIPIENT?.trim();
    const sessionId = process.env.WA_USAGE_SESSION_ID?.trim();
    if (!recipient || !sessionId) {
        console.warn(
            '[vehicle-usage-notification] WA_USAGE_RECIPIENT or WA_USAGE_SESSION_ID is not configured',
        );
        return;
    }

    const result = await sendWhatsApp(message, recipient, sessionId);
    if (!result.success) {
        console.warn('[vehicle-usage-notification] WhatsApp notification skipped:', result.error);
    }
}
