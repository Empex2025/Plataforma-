-- CreateIndex
CREATE INDEX "events_type_target_id_created_at_idx" ON "events"("type", "target_id", "created_at");

-- CreateIndex (spatial, not expressible in Prisma schema)
CREATE INDEX IF NOT EXISTS "idx_store_location" ON "stores" USING GIST ("location");
