/*
  Warnings:

  - You are about to drop the column `taskId` on the `Cashback` table. All the data in the column will be lost.
  - Added the required column `receiptId` to the `Cashback` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Cashback" DROP CONSTRAINT "Cashback_taskId_fkey";

-- DropIndex
DROP INDEX "Cashback_taskId_idx";

-- AlterTable
ALTER TABLE "Cashback" DROP COLUMN "taskId",
ADD COLUMN     "receiptId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Cashback_receiptId_idx" ON "Cashback"("receiptId");

-- AddForeignKey
ALTER TABLE "Cashback" ADD CONSTRAINT "Cashback_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
