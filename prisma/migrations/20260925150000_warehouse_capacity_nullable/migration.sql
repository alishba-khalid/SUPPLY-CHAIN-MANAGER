-- Capacity is optional: NULL means "unknown", shown as such in the UI.
ALTER TABLE "warehouses" ALTER COLUMN "capacity_units" DROP NOT NULL;

-- 0 was only ever written as a stand-in for "not provided" (a real
-- warehouse cannot have zero capacity), so it becomes unknown.
-- The 50000 import placeholder is deliberately NOT touched: it can't be
-- told apart from a genuine 50,000-unit warehouse.
UPDATE "warehouses" SET "capacity_units" = NULL WHERE "capacity_units" = 0;
