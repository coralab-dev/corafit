-- CreateEnum
CREATE TYPE "ClientSessionStatus" AS ENUM ('opened', 'in_progress', 'completed', 'partially_completed');

-- CreateTable
CREATE TABLE "client_session_logs" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "training_session_id" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "status" "ClientSessionStatus" NOT NULL DEFAULT 'opened',
    "snapshot_data" JSONB,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_session_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_session_logs_client_assignment_session_date_key" ON "client_session_logs"("client_id", "assignment_id", "training_session_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "client_session_logs_client_id_scheduled_date_idx" ON "client_session_logs"("client_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "client_session_logs_assignment_id_idx" ON "client_session_logs"("assignment_id");

-- CreateIndex
CREATE INDEX "client_session_logs_training_session_id_idx" ON "client_session_logs"("training_session_id");

-- CreateIndex
CREATE INDEX "client_session_logs_status_idx" ON "client_session_logs"("status");

-- AddForeignKey
ALTER TABLE "client_session_logs" ADD CONSTRAINT "client_session_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_session_logs" ADD CONSTRAINT "client_session_logs_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "client_training_plan_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_session_logs" ADD CONSTRAINT "client_session_logs_training_session_id_fkey" FOREIGN KEY ("training_session_id") REFERENCES "training_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;