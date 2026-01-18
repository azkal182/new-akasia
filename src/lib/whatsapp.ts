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

/**
 * Send a WhatsApp message via the multi-session API
 */
export async function sendWhatsApp(
    message: string,
    to?: string
): Promise<SendWhatsAppResult> {
    const apiUrl = process.env.WA_API_URL;
    const sessionId = process.env.WA_SESSION_ID;
    const apiKey = process.env.WA_API_KEY;
    const recipient = to || process.env.WA_RECIPIENT;

    if (!apiUrl || !sessionId || !apiKey || !recipient) {
        console.warn('WhatsApp API not configured, skipping notification');
        return { success: false, error: 'WhatsApp API not configured' };
    }

    try {
        const response = await fetch(`${apiUrl}/sessions/${sessionId}/send`, {
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

        if (!response.ok) {
            const errorText = await response.text();
            console.error('WhatsApp API error:', errorText);
            return { success: false, error: `API error: ${response.status}` };
        }

        const result = await response.json();
        console.log('WhatsApp message sent:', result);
        return { success: true };
    } catch (error) {
        console.error('Failed to send WhatsApp message:', error);
        return { success: false, error: 'Network error' };
    }
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
*Estimasi:* ${formattedEstimation}

🔗 *Link Approval:*
${data.approvalUrl}

_Klik link untuk menyetujui perizinan_`;
}
