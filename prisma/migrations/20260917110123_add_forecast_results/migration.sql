-- CreateTable
CREATE TABLE "forecast_results" (
    "id" SERIAL NOT NULL,
    "org_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "method_selected" TEXT NOT NULL,
    "method_reason" TEXT NOT NULL,
    "forecast_json" JSONB NOT NULL,
    "wape" DOUBLE PRECISION NOT NULL,
    "mape" DOUBLE PRECISION,
    "bias" DOUBLE PRECISION NOT NULL,
    "bias_pct" DOUBLE PRECISION NOT NULL,
    "rmse" DOUBLE PRECISION NOT NULL,
    "mase" DOUBLE PRECISION NOT NULL,
    "abc_class" TEXT NOT NULL,
    "xyz_class" TEXT NOT NULL,
    "policy_hint" TEXT NOT NULL,
    "warnings_json" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forecast_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forecast_results_org_id_idx" ON "forecast_results"("org_id");

-- CreateIndex
CREATE INDEX "forecast_results_org_id_computed_at_idx" ON "forecast_results"("org_id", "computed_at");

-- CreateIndex
CREATE UNIQUE INDEX "forecast_results_org_id_sku_warehouse_id_key" ON "forecast_results"("org_id", "sku", "warehouse_id");
