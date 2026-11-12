-- Track whether an uploaded tender is the active bid or a reference benchmark.
CREATE TYPE "TenderSourceType" AS ENUM ('ACTIVE', 'PUBLIC_REFERENCE', 'SYNTHETIC_REFERENCE');

ALTER TABLE "Tender"
ADD COLUMN "sourceType" "TenderSourceType" NOT NULL DEFAULT 'ACTIVE';
