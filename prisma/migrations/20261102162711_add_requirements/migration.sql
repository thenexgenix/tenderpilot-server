-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "displayId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "explanation" TEXT,
    "obligation" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "quote" TEXT,
    "verification" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "origin" TEXT NOT NULL DEFAULT 'AI',
    "checkStatus" TEXT NOT NULL DEFAULT 'NOT_REVIEWED',
    "checkNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Requirement_tenderId_idx" ON "Requirement"("tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_tenderId_displayId_key" ON "Requirement"("tenderId", "displayId");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
