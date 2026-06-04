-- Make `assets.address` NOT NULL; the chain's native asset (e.g. ETH) is now
-- represented by the zero address `0x0000…0000` instead of NULL. This frees
-- Prisma's `findUnique` on the `(chain_id, address)` compound unique to work
-- for the native row too — Postgres treats NULLs in unique indexes as
-- distinct, which made the native row both unenforceable and unlookable.

-- Backfill any existing NULL rows (typically the seeded native ETH row).
UPDATE "assets"
SET "address" = '0x0000000000000000000000000000000000000000'
WHERE "address" IS NULL;

-- Enforce NOT NULL going forward.
ALTER TABLE "assets" ALTER COLUMN "address" SET NOT NULL;
