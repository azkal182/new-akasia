/**
 * Telegram Bot API Helper
 *
 * Supports sending text messages and document files (e.g. PDFs) to a Telegram chat/group.
 */

interface TelegramResult {
  success: boolean;
  error?: string;
}

function getConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || token.startsWith('replace-with-') || !chatId || chatId.startsWith('replace-with-')) {
    return null;
  }

  return { token, chatId };
}

/**
 * Send a text message to the configured Telegram chat.
 * Supports Markdown V2 parse mode.
 */
export async function sendTelegramMessage(
  text: string,
  parseMode: 'Markdown' | 'HTML' | 'MarkdownV2' = 'Markdown'
): Promise<TelegramResult> {
  const config = getConfig();
  if (!config) {
    console.warn('[telegram] Bot not configured, skipping message');
    return { success: false, error: 'Telegram bot not configured' };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text,
          parse_mode: parseMode,
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error('[telegram] sendMessage failed:', response.status, body);
      return { success: false, error: `Telegram API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('[telegram] sendMessage error:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Send a PDF (or any file) as a document to the configured Telegram chat.
 */
export async function sendTelegramDocument(
  buffer: Buffer,
  filename: string,
  caption: string
): Promise<TelegramResult> {
  const config = getConfig();
  if (!config) {
    console.warn('[telegram] Bot not configured, skipping document');
    return { success: false, error: 'Telegram bot not configured' };
  }

  try {
    const formData = new FormData();
    formData.append('chat_id', config.chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    formData.append(
      'document',
      new Blob([new Uint8Array(buffer)], { type: 'application/pdf' }),
      filename
    );

    const response = await fetch(
      `https://api.telegram.org/bot${config.token}/sendDocument`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error('[telegram] sendDocument failed:', response.status, body);
      return { success: false, error: `Telegram API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('[telegram] sendDocument error:', error);
    return { success: false, error: 'Network error' };
  }
}
