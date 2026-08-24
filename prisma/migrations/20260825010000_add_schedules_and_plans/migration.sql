-- CreateEnum
CREATE TYPE "ProjectScheduleType" AS ENUM ('stream', 'post');

-- CreateTable
CREATE TABLE "ProjectSchedule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "ProjectScheduleType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPlan_pkey" PRIMARY KEY ("id")
);

-- MigrateData
INSERT INTO "ProjectSchedule" ("id", "projectId", "type", "startDate", "order", "createdAt", "updatedAt")
SELECT "id" || '-stream', "id", 'stream'::"ProjectScheduleType", "streamDate", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Project"
WHERE "streamDate" IS NOT NULL;

INSERT INTO "ProjectSchedule" ("id", "projectId", "type", "startDate", "order", "createdAt", "updatedAt")
SELECT "id" || '-post', "id", 'post'::"ProjectScheduleType", "postDate", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Project"
WHERE "postDate" IS NOT NULL;

-- CreateIndex
CREATE INDEX "ProjectSchedule_projectId_type_order_idx" ON "ProjectSchedule"("projectId", "type", "order");

-- CreateIndex
CREATE INDEX "ProjectPlan_projectId_order_idx" ON "ProjectPlan"("projectId", "order");

-- AddForeignKey
ALTER TABLE "ProjectSchedule" ADD CONSTRAINT "ProjectSchedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPlan" ADD CONSTRAINT "ProjectPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropColumn
ALTER TABLE "Project"
DROP COLUMN "appealPoints",
DROP COLUMN "requiredAppeals",
DROP COLUMN "streamDate",
DROP COLUMN "postDate";
