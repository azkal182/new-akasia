-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('FORM', 'APPROVE');

-- CreateTable
CREATE TABLE "PerizinanToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "perizinanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerizinanToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PerizinanToken_token_key" ON "PerizinanToken"("token");

-- CreateIndex
CREATE INDEX "PerizinanToken_token_idx" ON "PerizinanToken"("token");

-- CreateIndex
CREATE INDEX "PerizinanToken_expiresAt_idx" ON "PerizinanToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "PerizinanToken" ADD CONSTRAINT "PerizinanToken_perizinanId_fkey" FOREIGN KEY ("perizinanId") REFERENCES "Perizinan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
