-- AddEnum
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'REVIEW_APPROVED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'REVIEW_REJECTED';

-- AlterTable: Store rating fields
ALTER TABLE "stores" ADD COLUMN "rating_average" DECIMAL(3, 2);
ALTER TABLE "stores" ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Product rating fields
ALTER TABLE "products" ADD COLUMN "rating_average" DECIMAL(3, 2);
ALTER TABLE "products" ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Review moderation fields
ALTER TABLE "reviews" ADD COLUMN "moderated_by_id" UUID;
ALTER TABLE "reviews" ADD COLUMN "moderated_at" TIMESTAMP(3);
ALTER TABLE "reviews" ADD COLUMN "moderation_note" TEXT;
