-- CreateTable
CREATE TABLE "user_activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_address" TEXT NOT NULL,
    "pool_config" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "position_delta" TEXT NOT NULL,
    "rewards" TEXT NOT NULL,
    "block_number" INTEGER NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "sync_status" (
    "pool_config" TEXT NOT NULL PRIMARY KEY,
    "last_sync_block" INTEGER NOT NULL,
    "initialize_block" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "user_activity_user_address_pool_config_idx" ON "user_activity"("user_address", "pool_config");

-- CreateIndex
CREATE INDEX "user_activity_user_address_pool_config_event_type_idx" ON "user_activity"("user_address", "pool_config", "event_type");

-- CreateIndex
CREATE UNIQUE INDEX "user_activity_tx_hash_event_type_key" ON "user_activity"("tx_hash", "event_type");
