/**
 * WhatsApp API Helper
 * 
 * Uses wa-multi-session API to send messages
 * API: https://wa-multi-session.amtsilatipusat.com/api/v1
 */

interface SendWhatsAppResult {
    success: boolean;
    error?: string;
}

type VehicleUsageNotificationRecord = {
    startTime: Date;
    purpose: string;
    destination: string;
    estimatedDurationMinutes: number | null;
    car: { name: string; licensePlate: string | null };
    user: { name: string; username: string };
};

/**
 * Send a WhatsApp message via the multi-session API
 */
export async function sendWhatsApp(
    message: string,
    to?: string,
    sessionIdOverride?: string,
): Promise<SendWhatsAppResult> {
    const apiUrl = process.env.WA_API_URL;
    const sessionId = sessionIdOverride || process.env.WA_SESSION_ID;
    const apiKey = process.env.WA_API_KEY;
    const recipient = to || process.env.WA_RECIPIENT;

    if (!apiUrl || !sessionId || !apiKey || !recipient) {
        console.warn('WhatsApp API not configured, skipping notification');
        return { success: false, error: 'WhatsApp API not configured' };
    }

    const endpoint = `${apiUrl}/sessions/${sessionId}/send`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify({
                to: recipient,
                message,
            }),
        });

        const responseBody = await response.text();
        if (!response.ok) {
            console.error('WhatsApp API error:', responseBody);
            return { success: false, error: `API error: ${response.status}` };
        }

        let result: unknown = responseBody;
        try {
            result = JSON.parse(responseBody);
        } catch {
            // Keep the raw response when the API does not return JSON.
        }
        console.log('WhatsApp message sent:', result);
        return { success: true };
    } catch (error) {
        console.error('Failed to send WhatsApp message:', error);
        return { success: false, error: 'Network error' };
    }
}

function formatUsageDuration(minutes: number | null) {
    if (!minutes) return '-';
    if (minutes % 1440 === 0) return `${minutes / 1440} hari`;
    if (minutes % 60 === 0) return `${minutes / 60} jam`;
    return `${minutes} menit`;
}

export function formatVehicleUsageStartedMessage(
    records: VehicleUsageNotificationRecord[],
) {
    if (records.length === 0) return '';

    const dateFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const timeFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    const lines = [
        '🚗 DAFTAR PENGGUNAAN ARMADA',
        `Tanggal: ${dateFormatter.format(records[0].startTime)}`,
        '',
    ];

    records.forEach((record, index) => {
        lines.push(
            `${index + 1}. ${record.car.name} (${record.car.licensePlate ?? '-'})`,
            `   Pengemudi: ${record.user.name || record.user.username}`,
            `   Keperluan: ${record.purpose}`,
            `   Tujuan: ${record.destination}`,
            `   Mulai: ${timeFormatter.format(record.startTime)} WIB`,
            `   Estimasi: ${formatUsageDuration(record.estimatedDurationMinutes)}`,
            '',
        );
    });

    lines.push(`Total penggunaan armada: ${records.length}`);
    return lines.join('\n');
}

/**
 * Format perizinan notification message
 */
export function formatPerizinanMessage(data: {
    name: string;
    carName: string;
    licensePlate: string | null;
    purpose: string;
    destination: string;
    date: Date;
    numberOfPassengers: number;
    estimation: number;
    approvalUrl: string;
}): string {
    const formattedDate = data.date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const formattedEstimation = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(data.estimation);

    return `📋 *PERIZINAN BARU*

*Pemohon:* ${data.name}
*Kendaraan:* ${data.carName} (${data.licensePlate || '-'})
*Keperluan:* ${data.purpose}
*Tujuan:* ${data.destination}
*Tanggal:* ${formattedDate}
*Jumlah Penumpang:* ${data.numberOfPassengers} orang
*Estimasi:* ${data.estimation} hari

🔗 *Link Approval:*
${data.approvalUrl}

_Klik link untuk menyetujui perizinan_`;
}

/**
 * Format approval confirmation notification message
 */
export function formatPerizinanApprovedMessage(data: {
    name: string;
    carName: string;
    licensePlate: string | null;
    purpose: string;
    destination: string;
    date: Date;
    numberOfPassengers: number;
    estimation: number;
}): string {
    const formattedDate = data.date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return `✅ *PERIZINAN DISETUJUI*

*Pemohon:* ${data.name}
*Kendaraan:* ${data.carName} (${data.licensePlate || '-'})
*Keperluan:* ${data.purpose}
*Tujuan:* ${data.destination}
*Tanggal:* ${formattedDate}
*Jumlah Penumpang:* ${data.numberOfPassengers} orang
*Durasi:* ${data.estimation} hari

Perizinan kendaraan telah disetujui.`;
}
