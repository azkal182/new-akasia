/*
  Warnings:

  - Added the required column `literAmount` to the `FuelPurchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePerLiter` to the `FuelPurchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `FuelPurchase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FuelPurchase" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "literAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "pricePerLiter" INTEGER NOT NULL,
ADD COLUMN     "totalAmount" INTEGER NOT NULL,
ALTER COLUMN "fuelType" SET DEFAULT 'SOLAR';

-- CreateIndex
CREATE INDEX "FuelPurchase_carId_idx" ON "FuelPurchase"("carId");

-- CreateIndex
CREATE INDEX "FuelPurchase_createdAt_idx" ON "FuelPurchase"("createdAt");
