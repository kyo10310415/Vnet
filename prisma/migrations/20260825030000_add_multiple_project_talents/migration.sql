-- CreateEnum
CREATE TYPE "TalentAssignmentType" AS ENUM ('individual', 'group');

-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "talentType" "TalentAssignmentType" NOT NULL DEFAULT 'individual',
ADD COLUMN "talentGroupName" TEXT;

-- CreateTable
CREATE TABLE "ProjectTalent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTalent_pkey" PRIMARY KEY ("id")
);

-- Preserve existing single-talent assignments.
INSERT INTO "ProjectTalent" ("id", "projectId", "talentId", "order")
SELECT 'legacy_' || md5("id" || ':' || "talentId"), "id", "talentId", 0
FROM "Project"
WHERE "talentId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTalent_projectId_talentId_key" ON "ProjectTalent"("projectId", "talentId");
CREATE INDEX "ProjectTalent_projectId_order_idx" ON "ProjectTalent"("projectId", "order");
CREATE INDEX "ProjectTalent_talentId_idx" ON "ProjectTalent"("talentId");

-- AddForeignKey
ALTER TABLE "ProjectTalent" ADD CONSTRAINT "ProjectTalent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTalent" ADD CONSTRAINT "ProjectTalent_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove the legacy single-talent relation after the data copy.
ALTER TABLE "Project" DROP CONSTRAINT "Project_talentId_fkey";
ALTER TABLE "Project" DROP COLUMN "talentId";
