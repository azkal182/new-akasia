-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'DRIVER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'FUEL_PURCHASE');

-- CreateEnum
CREATE TYPE "CarStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "UsageStatus" AS ENUM ('ONGOING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('SOLAR', 'BENSIN');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('ANNUAL', 'FIVE_YEAR');

-- CreateEnum
CREATE TYPE "PengajuanStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PerizinanStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Income" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'Yayasan',
    "notes" TEXT,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "carId" TEXT,
    "expenseId" TEXT NOT NULL,

    CONSTRAINT "ExpenseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licensePlate" TEXT,
    "barcodeString" TEXT,
    "status" "CarStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" "UsageStatus" NOT NULL DEFAULT 'ONGOING',
    "carId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelPurchase" (
    "id" TEXT NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "carId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "FuelPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tax" (
    "id" TEXT NOT NULL,
    "type" "TaxType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "carId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxPayment" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "taxId" TEXT NOT NULL,

    CONSTRAINT "TaxPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengajuan" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PengajuanStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengajuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengajuanItem" (
    "id" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "estimation" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "carId" TEXT NOT NULL,
    "pengajuanId" TEXT NOT NULL,

    CONSTRAINT "PengajuanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perizinan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "description" TEXT,
    "numberOfPassengers" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "estimation" INTEGER NOT NULL,
    "status" "PerizinanStatus" NOT NULL DEFAULT 'PENDING',
    "carId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perizinan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Income_transactionId_key" ON "Income"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_transactionId_key" ON "Expense"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Car_licensePlate_key" ON "Car"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "Car_barcodeString_key" ON "Car"("barcodeString");

-- CreateIndex
CREATE INDEX "Car_status_idx" ON "Car"("status");

-- CreateIndex
CREATE INDEX "Car_licensePlate_idx" ON "Car"("licensePlate");

-- CreateIndex
CREATE INDEX "UsageRecord_status_idx" ON "UsageRecord"("status");

-- CreateIndex
CREATE INDEX "UsageRecord_carId_idx" ON "UsageRecord"("carId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelPurchase_transactionId_key" ON "FuelPurchase"("transactionId");

-- CreateIndex
CREATE INDEX "Tax_dueDate_idx" ON "Tax"("dueDate");

-- CreateIndex
CREATE INDEX "Tax_isPaid_idx" ON "Tax"("isPaid");

-- CreateIndex
CREATE INDEX "Pengajuan_status_idx" ON "Pengajuan"("status");

-- CreateIndex
CREATE INDEX "Pengajuan_date_idx" ON "Pengajuan"("date");

-- CreateIndex
CREATE INDEX "Perizinan_status_idx" ON "Perizinan"("status");

-- CreateIndex
CREATE INDEX "Perizinan_date_idx" ON "Perizinan"("date");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelPurchase" ADD CONSTRAINT "FuelPurchase_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelPurchase" ADD CONSTRAINT "FuelPurchase_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tax" ADD CONSTRAINT "Tax_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxPayment" ADD CONSTRAINT "TaxPayment_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanItem" ADD CONSTRAINT "PengajuanItem_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanItem" ADD CONSTRAINT "PengajuanItem_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "Pengajuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Perizinan" ADD CONSTRAINT "Perizinan_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
