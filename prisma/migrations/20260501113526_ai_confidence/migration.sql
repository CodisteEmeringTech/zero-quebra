-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "confidencePct" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "urgencyWindowHours" INTEGER NOT NULL DEFAULT 2;
