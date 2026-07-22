-- Create GiftAPI product mapping table
CREATE TABLE IF NOT EXISTS "GiftApiProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "giftapiProductId" TEXT NOT NULL UNIQUE,
    "giftapiSkuId" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "denominationType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(10, 2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "maxPerOrder" INTEGER NOT NULL DEFAULT 1,
    "attributes" JSONB,
    "image" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_giftapi_sku" ON "GiftApiProduct"("giftapiSkuId");
CREATE INDEX IF NOT EXISTS "idx_giftapi_product" ON "GiftApiProduct"("giftapiProductId");
CREATE INDEX IF NOT EXISTS "idx_giftapi_type" ON "GiftApiProduct"("type");

-- Add GiftAPI order tracking to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "giftapiOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "giftapiExternalId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "giftapiStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "giftapiDeliveryData" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_giftapi" ON "Order"("giftapiExternalId");
