-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('NOT_STARTED', 'GENERATING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Tender" ADD COLUMN     "draftErrorCode" TEXT,
ADD COLUMN     "draftStatus" "DraftStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "draftUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DraftSection" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "generated" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DraftSection_tenderId_idx" ON "DraftSection"("tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftSection_tenderId_key_key" ON "DraftSection"("tenderId", "key");

-- AddForeignKey
ALTER TABLE "DraftSection" ADD CONSTRAINT "DraftSection_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
