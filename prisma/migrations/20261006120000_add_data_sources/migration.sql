-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "last_refreshed_at" TIMESTAMP(3),
    "last_result" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_sources_org_id_idx" ON "data_sources"("org_id");

-- CreateIndex
CREATE INDEX "data_sources_schedule_idx" ON "data_sources"("schedule");
