-- CreateTable
CREATE TABLE "AiAnalysisUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usageDate" TEXT NOT NULL,
    "analysisCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAnalysisUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAnalysisUsage_userId_idx" ON "AiAnalysisUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiAnalysisUsage_userId_usageDate_key" ON "AiAnalysisUsage"("userId", "usageDate");

-- AddForeignKey
ALTER TABLE "AiAnalysisUsage" ADD CONSTRAINT "AiAnalysisUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
