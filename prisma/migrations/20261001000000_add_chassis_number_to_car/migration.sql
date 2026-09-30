ALTER TABLE "Car" ADD COLUMN "chassisNumber" TEXT;

CREATE UNIQUE INDEX "Car_chassisNumber_key" ON "Car"("chassisNumber");

CREATE INDEX "Car_chassisNumber_idx" ON "Car"("chassisNumber");
