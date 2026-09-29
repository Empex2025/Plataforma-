-- Repair migration: restore the partial unique index that guarantees at most one
-- active price (valid_to IS NULL) per (store_id, product_id, type).
--
-- This index is intentionally NOT representable in prisma/schema.prisma (Prisma
-- does not model partial/filtered indexes), so it is maintained through raw SQL.
-- It was present in the original migrations and was lost when the migrations were
-- consolidated from the schema.
--
-- Safety:
--   * No data is deleted.
--   * If conflicting active prices exist, this statement fails with a unique
--     violation and the migration aborts — the conflicts must be resolved manually.
--   * IF NOT EXISTS keeps the migration safe on databases that still have the index.
CREATE UNIQUE INDEX IF NOT EXISTS "prices_active_unique_idx"
  ON "prices" ("store_id", "product_id", "type")
  WHERE "valid_to" IS NULL;
