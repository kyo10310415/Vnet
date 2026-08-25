-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('stream', 'x_post', 'combined');

-- AlterTable
ALTER TABLE "Metric"
ADD COLUMN "type" "MetricType" NOT NULL DEFAULT 'combined',
ADD COLUMN "label" TEXT,
ADD COLUMN "recordedAt" TIMESTAMP(3),
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- MigrateData
UPDATE "Metric"
SET "type" = CASE
  WHEN (
    "youtubeUrl" IS NOT NULL OR "youtubeViews" IS NOT NULL OR
    "peakConcurrent" IS NOT NULL OR "avgViewDuration" IS NOT NULL OR
    "likes" IS NOT NULL OR "comments" IS NOT NULL
  ) AND (
    "xPostUrl" IS NULL AND "xImpressions" IS NULL AND "xLikes" IS NULL AND
    "xReposts" IS NULL AND "clicks" IS NULL
  ) THEN 'stream'::"MetricType"
  WHEN (
    "xPostUrl" IS NOT NULL OR "xImpressions" IS NOT NULL OR "xLikes" IS NOT NULL OR
    "xReposts" IS NOT NULL OR "clicks" IS NOT NULL
  ) AND (
    "youtubeUrl" IS NULL AND "youtubeViews" IS NULL AND
    "peakConcurrent" IS NULL AND "avgViewDuration" IS NULL AND
    "likes" IS NULL AND "comments" IS NULL
  ) THEN 'x_post'::"MetricType"
  ELSE 'combined'::"MetricType"
END;

-- Replace the former one-record-per-project constraint
DROP INDEX "Metric_projectId_key";
CREATE INDEX "Metric_projectId_order_idx" ON "Metric"("projectId", "order");

-- New records default to a stream entry when the type is omitted
ALTER TABLE "Metric" ALTER COLUMN "type" SET DEFAULT 'stream';
