-- CreateTable
CREATE TABLE "design_partner_applications" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "work_email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sku_count" INTEGER NOT NULL,
    "warehouse_count" INTEGER NOT NULL,
    "current_tool" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_partner_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_check_leads" (
    "id" SERIAL NOT NULL,
    "work_email" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_check_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "design_partner_applications_created_at_idx" ON "design_partner_applications"("created_at");

-- CreateIndex
CREATE INDEX "health_check_leads_created_at_idx" ON "health_check_leads"("created_at");
