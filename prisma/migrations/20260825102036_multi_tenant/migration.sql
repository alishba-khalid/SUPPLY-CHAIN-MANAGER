-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_sku_fkey";

-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_supplier_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_sku_fkey";

-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_supplier_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_sku_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_warehouse_id_fkey";

-- DropIndex
DROP INDEX "inventory_sku_idx";

-- DropIndex
DROP INDEX "inventory_sku_warehouse_id_key";

-- DropIndex
DROP INDEX "inventory_warehouse_id_idx";

-- DropIndex
DROP INDEX "products_sku_key";

-- DropIndex
DROP INDEX "products_supplier_id_idx";

-- DropIndex
DROP INDEX "purchase_orders_expected_date_idx";

-- DropIndex
DROP INDEX "purchase_orders_order_date_idx";

-- DropIndex
DROP INDEX "purchase_orders_po_number_key";

-- DropIndex
DROP INDEX "purchase_orders_received_date_idx";

-- DropIndex
DROP INDEX "purchase_orders_sku_idx";

-- DropIndex
DROP INDEX "purchase_orders_supplier_id_idx";

-- DropIndex
DROP INDEX "suppliers_supplier_id_key";

-- DropIndex
DROP INDEX "transactions_date_idx";

-- DropIndex
DROP INDEX "transactions_sku_idx";

-- DropIndex
DROP INDEX "transactions_warehouse_id_idx";

-- DropIndex
DROP INDEX "warehouses_code_key";

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "org_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "org_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "org_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "org_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "org_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "warehouses" ADD COLUMN     "org_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "inventory_org_id_sku_idx" ON "inventory"("org_id", "sku");

-- CreateIndex
CREATE INDEX "inventory_org_id_warehouse_id_idx" ON "inventory"("org_id", "warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_org_id_sku_warehouse_id_key" ON "inventory"("org_id", "sku", "warehouse_id");

-- CreateIndex
CREATE INDEX "products_org_id_supplier_id_idx" ON "products"("org_id", "supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_org_id_sku_key" ON "products"("org_id", "sku");

-- CreateIndex
CREATE INDEX "purchase_orders_org_id_sku_idx" ON "purchase_orders"("org_id", "sku");

-- CreateIndex
CREATE INDEX "purchase_orders_org_id_supplier_id_idx" ON "purchase_orders"("org_id", "supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_org_id_order_date_idx" ON "purchase_orders"("org_id", "order_date");

-- CreateIndex
CREATE INDEX "purchase_orders_org_id_expected_date_idx" ON "purchase_orders"("org_id", "expected_date");

-- CreateIndex
CREATE INDEX "purchase_orders_org_id_received_date_idx" ON "purchase_orders"("org_id", "received_date");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_org_id_po_number_key" ON "purchase_orders"("org_id", "po_number");

-- CreateIndex
CREATE INDEX "suppliers_org_id_idx" ON "suppliers"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_org_id_supplier_id_key" ON "suppliers"("org_id", "supplier_id");

-- CreateIndex
CREATE INDEX "transactions_org_id_sku_idx" ON "transactions"("org_id", "sku");

-- CreateIndex
CREATE INDEX "transactions_org_id_warehouse_id_idx" ON "transactions"("org_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "transactions_org_id_date_idx" ON "transactions"("org_id", "date");

-- CreateIndex
CREATE INDEX "warehouses_org_id_idx" ON "warehouses"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_org_id_code_key" ON "warehouses"("org_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_org_id_id_key" ON "warehouses"("org_id", "id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_org_id_supplier_id_fkey" FOREIGN KEY ("org_id", "supplier_id") REFERENCES "suppliers"("org_id", "supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_org_id_sku_fkey" FOREIGN KEY ("org_id", "sku") REFERENCES "products"("org_id", "sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_org_id_warehouse_id_fkey" FOREIGN KEY ("org_id", "warehouse_id") REFERENCES "warehouses"("org_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_org_id_supplier_id_fkey" FOREIGN KEY ("org_id", "supplier_id") REFERENCES "suppliers"("org_id", "supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_org_id_sku_fkey" FOREIGN KEY ("org_id", "sku") REFERENCES "products"("org_id", "sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_org_id_sku_fkey" FOREIGN KEY ("org_id", "sku") REFERENCES "products"("org_id", "sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_org_id_warehouse_id_fkey" FOREIGN KEY ("org_id", "warehouse_id") REFERENCES "warehouses"("org_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

