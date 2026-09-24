-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "import_key" TEXT;

-- CreateTable
CREATE TABLE "organizations" (
    "org_id" TEXT NOT NULL,
    "import_row_limit_override" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("org_id")
);

-- CreateTable
CREATE TABLE "import_sessions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "total_chunks" INTEGER NOT NULL,
    "clear_existing" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_staged_chunks" (
    "org_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "row_count" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_staged_chunks_pkey" PRIMARY KEY ("org_id","session_id","chunk_index")
);

-- CreateIndex
CREATE INDEX "import_sessions_org_id_fingerprint_idx" ON "import_sessions"("org_id", "fingerprint");

-- CreateIndex
CREATE INDEX "import_sessions_created_at_idx" ON "import_sessions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "import_sessions_org_id_id_key" ON "import_sessions"("org_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_org_id_import_key_key" ON "transactions"("org_id", "import_key");

-- AddForeignKey
ALTER TABLE "import_staged_chunks" ADD CONSTRAINT "import_staged_chunks_org_id_session_id_fkey" FOREIGN KEY ("org_id", "session_id") REFERENCES "import_sessions"("org_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

