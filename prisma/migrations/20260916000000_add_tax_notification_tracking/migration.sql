-- Track the last Telegram reminder sent for each unpaid tax.
ALTER TABLE "Tax" ADD COLUMN "lastNotificationKey" TEXT;
