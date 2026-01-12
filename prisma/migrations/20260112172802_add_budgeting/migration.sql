-- CreateEnum
CREATE TYPE "SpendingTaskStatus" AS ENUM ('DRAFT', 'FUNDED', 'SPENDING', 'NEEDS_REFUND', 'NEEDS_REIMBURSE', 'SETTLED');

-- CreateEnum
CREATE TYPE "SettlementType" AS ENUM ('REFUND', 'REIMBURSE');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'DONE');

-- CreateEnum
CREATE TYPE "WalletEntryType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "WalletEntrySource" AS ENUM ('CASHBACK', 'MANUAL');

-- CreateTable
CREATE TABLE "SpendingTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SpendingTaskStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpendingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskFunding" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'Yayasan',
    "notes" TEXT,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskFunding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "vendor" TEXT,
    "receiptNo" TEXT,
    "receiptDate" TIMESTAMP(3),
    "notes" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptAttachment" (
    "id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "receiptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "receiptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSettlement" (
    "id" TEXT NOT NULL,
    "type" "SettlementType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "doneAt" TIMESTAMP(3),
    "notes" TEXT,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Global Wallet',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" TEXT NOT NULL,
    "type" "WalletEntryType" NOT NULL,
    "source" "WalletEntrySource" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachmentUrl" TEXT,
    "walletId" TEXT NOT NULL,
    "taskId" TEXT,
    "cashbackId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cashback" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "vendor" TEXT,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cashback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpendingTask_status_idx" ON "SpendingTask"("status");

-- CreateIndex
CREATE INDEX "SpendingTask_createdAt_idx" ON "SpendingTask"("createdAt");

-- CreateIndex
CREATE INDEX "SpendingTask_createdById_idx" ON "SpendingTask"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "TaskFunding_taskId_key" ON "TaskFunding"("taskId");

-- CreateIndex
CREATE INDEX "TaskFunding_receivedAt_idx" ON "TaskFunding"("receivedAt");

-- CreateIndex
CREATE INDEX "Receipt_taskId_idx" ON "Receipt"("taskId");

-- CreateIndex
CREATE INDEX "Receipt_receiptDate_idx" ON "Receipt"("receiptDate");

-- CreateIndex
CREATE INDEX "ReceiptAttachment_receiptId_idx" ON "ReceiptAttachment"("receiptId");

-- CreateIndex
CREATE INDEX "ReceiptItem_receiptId_idx" ON "ReceiptItem"("receiptId");

-- CreateIndex
CREATE INDEX "TaskSettlement_status_idx" ON "TaskSettlement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSettlement_taskId_type_key" ON "TaskSettlement"("taskId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_name_key" ON "Wallet"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WalletEntry_cashbackId_key" ON "WalletEntry"("cashbackId");

-- CreateIndex
CREATE INDEX "WalletEntry_walletId_occurredAt_idx" ON "WalletEntry"("walletId", "occurredAt");

-- CreateIndex
CREATE INDEX "WalletEntry_type_idx" ON "WalletEntry"("type");

-- CreateIndex
CREATE INDEX "WalletEntry_source_idx" ON "WalletEntry"("source");

-- CreateIndex
CREATE INDEX "Cashback_taskId_idx" ON "Cashback"("taskId");

-- CreateIndex
CREATE INDEX "Cashback_occurredAt_idx" ON "Cashback"("occurredAt");

-- AddForeignKey
ALTER TABLE "SpendingTask" ADD CONSTRAINT "SpendingTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskFunding" ADD CONSTRAINT "TaskFunding_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SpendingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SpendingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptAttachment" ADD CONSTRAINT "ReceiptAttachment_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSettlement" ADD CONSTRAINT "TaskSettlement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SpendingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SpendingTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_cashbackId_fkey" FOREIGN KEY ("cashbackId") REFERENCES "Cashback"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashback" ADD CONSTRAINT "Cashback_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SpendingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashback" ADD CONSTRAINT "Cashback_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
