-- CreateTable
CREATE TABLE "org_subscriptions" (
    "id" SERIAL NOT NULL,
    "org_id" TEXT NOT NULL,
    "polar_subscription_id" TEXT NOT NULL,
    "polar_customer_id" TEXT NOT NULL,
    "polar_product_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "ended_at" TIMESTAMP(3),
    "past_due_since" TIMESTAMP(3),
    "polar_modified_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polar_webhook_events" (
    "webhook_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "polar_webhook_events_pkey" PRIMARY KEY ("webhook_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_subscriptions_polar_subscription_id_key" ON "org_subscriptions"("polar_subscription_id");

-- CreateIndex
CREATE INDEX "org_subscriptions_org_id_idx" ON "org_subscriptions"("org_id");

