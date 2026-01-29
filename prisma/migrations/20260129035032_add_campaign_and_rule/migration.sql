-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "placement" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "buttonText" TEXT,
    "buttonUrl" TEXT,
    "styleJson" TEXT NOT NULL DEFAULT '{}',
    "startAt" DATETIME,
    "endAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "pageScope" TEXT NOT NULL,
    "urlPrefix" TEXT,
    "device" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "suppressDaysAfterClose" INTEGER NOT NULL DEFAULT 7,
    CONSTRAINT "Rule_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopDomain_key" ON "Shop"("shopDomain");

-- CreateIndex
CREATE INDEX "Campaign_shopId_enabled_priority_idx" ON "Campaign"("shopId", "enabled", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "Rule_campaignId_key" ON "Rule"("campaignId");

-- CreateIndex
CREATE INDEX "Rule_campaignId_idx" ON "Rule"("campaignId");
