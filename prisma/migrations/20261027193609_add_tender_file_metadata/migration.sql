/*
  Warnings:

  - A unique constraint covering the columns `[fileStorageKey]` on the table `Tender` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Tender" ADD COLUMN     "fileMimeType" TEXT,
ADD COLUMN     "fileOriginalName" TEXT,
ADD COLUMN     "fileSha256" TEXT,
ADD COLUMN     "fileSizeBytes" INTEGER,
ADD COLUMN     "fileStorageKey" TEXT,
ADD COLUMN     "fileUploadedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Tender_fileStorageKey_key" ON "Tender"("fileStorageKey");

-- CreateIndex
CREATE INDEX "Tender_ownerId_fileSha256_idx" ON "Tender"("ownerId", "fileSha256");
