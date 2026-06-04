-- Switch user_current_balances key from user_id to address, drop public.users.
-- Bivium is non-custodial: the EOA is the user, no separate record needed.

-- 1. Add address column (nullable until backfilled).
ALTER TABLE "user_current_balances" ADD COLUMN "address" TEXT;

-- 2. Backfill from users (single source of truth pre-migration).
UPDATE "user_current_balances" b
SET "address" = u."address"
FROM "users" u
WHERE b."user_id" = u."id";

-- 3. Enforce NOT NULL once backfill is complete.
ALTER TABLE "user_current_balances" ALTER COLUMN "address" SET NOT NULL;

-- 4. Replace the PK: (user_id, asset_id) → (address, asset_id).
ALTER TABLE "user_current_balances" DROP CONSTRAINT "user_current_balances_user_id_fkey";
ALTER TABLE "user_current_balances" DROP CONSTRAINT "user_current_balances_pkey";
ALTER TABLE "user_current_balances" DROP COLUMN "user_id";
ALTER TABLE "user_current_balances" ADD CONSTRAINT "user_current_balances_pkey" PRIMARY KEY ("address", "asset_id");

-- 5. Index for address-only lookups (cross-asset balance listing).
CREATE INDEX "user_current_balances_address_idx" ON "user_current_balances" ("address");

-- 6. Drop the now-orphan users table.
DROP TABLE "users";
