-- Optional: enable pgvector so PgVectorStore distance queries (`::vector` operator) work.
-- The schema keeps `Embedding.vector` as `double precision[]`, so nothing here depends on it
-- and servers without pgvector keep working through the ArrayVectorStore fallback.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS "vector"';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "SponsoredTargetType" AS ENUM ('STORE', 'PRODUCT', 'OFFER');

-- CreateEnum
CREATE TYPE "AttributionType" AS ENUM ('CLICK', 'IMPRESSION', 'DIRECT', 'UNATTRIBUTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'AD_IMPRESSION';
ALTER TYPE "EventType" ADD VALUE 'AD_CLICK';
ALTER TYPE "EventType" ADD VALUE 'RECOMMENDATION_IMPRESSION';
ALTER TYPE "EventType" ADD VALUE 'RECOMMENDATION_CLICK';

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "advertising" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "cover_url" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "logo_url" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "document" TEXT,
ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "person_type" TEXT,
ADD COLUMN     "phone_verified_at" TIMESTAMP(3),
ADD COLUMN     "profile_completed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "store_hours" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "days" TEXT[],
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "budget" DECIMAL(10,2),
    "spend" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cost_per_click" DECIMAL(10,2),
    "cost_per_mille" DECIMAL(10,2),
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "target_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsored_items" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "target_type" "SponsoredTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsored_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_metrics" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "spend" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "campaign_id" UUID,
    "target_type" TEXT,
    "target_id" UUID,
    "revenue" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "attribution_type" "AttributionType" NOT NULL DEFAULT 'UNATTRIBUTED',
    "source" TEXT NOT NULL DEFAULT 'platform',
    "external_ref" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" UUID,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embeddings" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "dimension" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "vector" DOUBLE PRECISION[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "targeting" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_variants" (
    "id" UUID NOT NULL,
    "experiment_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allocation" INTEGER NOT NULL,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiment_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_assignments" (
    "id" UUID NOT NULL,
    "experiment_id" UUID NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "variant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_hours_store_id_idx" ON "store_hours"("store_id");

-- CreateIndex
CREATE INDEX "campaigns_company_id_idx" ON "campaigns"("company_id");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_status_start_at_end_at_idx" ON "campaigns"("status", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "sponsored_items_target_type_target_id_idx" ON "sponsored_items"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "sponsored_items_campaign_id_target_type_target_id_key" ON "sponsored_items"("campaign_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "campaign_metrics_campaign_id_date_idx" ON "campaign_metrics"("campaign_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_metrics_campaign_id_date_key" ON "campaign_metrics"("campaign_id", "date");

-- CreateIndex
CREATE INDEX "conversions_company_id_occurred_at_idx" ON "conversions"("company_id", "occurred_at");

-- CreateIndex
CREATE INDEX "conversions_campaign_id_occurred_at_idx" ON "conversions"("campaign_id", "occurred_at");

-- CreateIndex
CREATE INDEX "conversions_target_type_target_id_idx" ON "conversions"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversions_company_id_external_ref_key" ON "conversions"("company_id", "external_ref");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_target_type_target_id_idx" ON "notifications"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "embeddings_entity_type_idx" ON "embeddings"("entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "embeddings_entity_type_entity_id_model_version_key" ON "embeddings"("entity_type", "entity_id", "model", "version");

-- CreateIndex
CREATE UNIQUE INDEX "experiments_key_key" ON "experiments"("key");

-- CreateIndex
CREATE INDEX "experiments_domain_status_idx" ON "experiments"("domain", "status");

-- CreateIndex
CREATE INDEX "experiment_variants_experiment_id_idx" ON "experiment_variants"("experiment_id");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_variants_experiment_id_key_key" ON "experiment_variants"("experiment_id", "key");

-- CreateIndex
CREATE INDEX "experiment_assignments_experiment_id_variant_id_idx" ON "experiment_assignments"("experiment_id", "variant_id");

-- CreateIndex
CREATE INDEX "experiment_assignments_subject_type_subject_id_idx" ON "experiment_assignments"("subject_type", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_assignments_experiment_id_subject_type_subject_i_key" ON "experiment_assignments"("experiment_id", "subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "favorites_target_type_target_id_idx" ON "favorites"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_document_key" ON "users"("document");

-- AddForeignKey
ALTER TABLE "store_hours" ADD CONSTRAINT "store_hours_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsored_items" ADD CONSTRAINT "sponsored_items_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_variants" ADD CONSTRAINT "experiment_variants_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "experiment_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_store_location" RENAME TO "stores_location_idx";

