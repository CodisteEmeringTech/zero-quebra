-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COO', 'STORE_MANAGER', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "UrgencyTier" AS ENUM ('SAFE', 'AMBER', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('MARKDOWN', 'PROMOTE', 'REMOVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "storeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "storeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "shrinkagePct30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeInDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sku" (
    "id" TEXT NOT NULL,
    "skuCode" TEXT NOT NULL,
    "productNamePt" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'FLV',
    "baseCostBrl" DOUBLE PRECISION NOT NULL,
    "baseSaleBrl" DOUBLE PRECISION NOT NULL,
    "marginFloorBrl" DOUBLE PRECISION NOT NULL,
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "shelf" TEXT NOT NULL,
    "unitsInStock" INTEGER NOT NULL,
    "hoursToExpiry" INTEGER NOT NULL,
    "unitsSoldToday" INTEGER NOT NULL DEFAULT 0,
    "velocityPerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dayOfWeekIndex" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "weatherSensitivity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "urgencyTier" "UrgencyTier" NOT NULL DEFAULT 'SAFE',
    "isHeadline" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "urgency" "UrgencyTier" NOT NULL,
    "recommendation" "ActionType" NOT NULL,
    "discountPct" INTEGER NOT NULL,
    "reasonPt" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "recommendation" "ActionType" NOT NULL,
    "discountPct" INTEGER NOT NULL,
    "confirmedById" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CooDailyMetric" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "shrinkagePct" DOUBLE PRECISION NOT NULL,
    "savingsBrl" DOUBLE PRECISION NOT NULL,
    "actionsConfirmed" INTEGER NOT NULL,

    CONSTRAINT "CooDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningWeek" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "accuracyPct" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "LearningWeek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Store_storeCode_key" ON "Store"("storeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sku_skuCode_key" ON "Sku"("skuCode");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_skuId_storeId_key" ON "Inventory"("skuId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionLog_alertId_key" ON "ActionLog"("alertId");

-- CreateIndex
CREATE INDEX "CooDailyMetric_date_idx" ON "CooDailyMetric"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CooDailyMetric_storeId_date_key" ON "CooDailyMetric"("storeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LearningWeek_week_key" ON "LearningWeek"("week");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CooDailyMetric" ADD CONSTRAINT "CooDailyMetric_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
