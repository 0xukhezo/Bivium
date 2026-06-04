-- CreateEnum
CREATE TYPE "OnchainEventProvider" AS ENUM ('ALCHEMY');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('NATIVE', 'ERC20');

-- CreateEnum
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "name" TEXT,
    "logo_url" TEXT,
    "type" "AssetType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_prices" (
    "asset_id" TEXT NOT NULL,
    "price_usd" DECIMAL(38,18) NOT NULL,
    "source" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_prices_pkey" PRIMARY KEY ("asset_id")
);

-- CreateTable
CREATE TABLE "user_current_balances" (
    "user_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "balance" DECIMAL(78,0) NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_current_balances_pkey" PRIMARY KEY ("user_id","asset_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onchain_events" (
    "id" TEXT NOT NULL,
    "provider" "OnchainEventProvider" NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" BOOLEAN NOT NULL DEFAULT false,
    "times_processed" INTEGER NOT NULL DEFAULT 0,
    "last_processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onchain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'bivium.events',
    "routing_key" TEXT NOT NULL,
    "event" JSONB NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "last_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_chain_id_address_key" ON "assets"("chain_id", "address");

-- CreateIndex
CREATE INDEX "user_current_balances_chain_id_idx" ON "user_current_balances"("chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_address_key" ON "users"("address");

-- CreateIndex
CREATE INDEX "onchain_events_provider_processed_created_at_idx" ON "onchain_events"("provider", "processed", "created_at");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- AddForeignKey
ALTER TABLE "asset_prices" ADD CONSTRAINT "asset_prices_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_current_balances" ADD CONSTRAINT "user_current_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_current_balances" ADD CONSTRAINT "user_current_balances_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
