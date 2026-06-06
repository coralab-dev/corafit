-- CreateEnum
CREATE TYPE "ProgressRecordActor" AS ENUM ('coach', 'client');

-- CreateTable
CREATE TABLE "weight_logs" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "recorded_by_type" "ProgressRecordActor" NOT NULL,
    "recorded_by_member_id" TEXT,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weight_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_measurement_logs" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "recorded_by_member_id" TEXT NOT NULL,
    "waist_cm" DOUBLE PRECISION,
    "hip_cm" DOUBLE PRECISION,
    "chest_cm" DOUBLE PRECISION,
    "arm_cm" DOUBLE PRECISION,
    "leg_cm" DOUBLE PRECISION,
    "glute_cm" DOUBLE PRECISION,
    "visible_to_client" BOOLEAN NOT NULL DEFAULT false,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "body_measurement_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weight_logs_client_id_recorded_at_idx" ON "weight_logs"("client_id", "recorded_at");

-- CreateIndex
CREATE INDEX "weight_logs_client_id_deleted_at_recorded_at_idx" ON "weight_logs"("client_id", "deleted_at", "recorded_at");

-- CreateIndex
CREATE INDEX "weight_logs_recorded_by_member_id_idx" ON "weight_logs"("recorded_by_member_id");

-- CreateIndex
CREATE INDEX "body_measurement_logs_client_id_recorded_at_idx" ON "body_measurement_logs"("client_id", "recorded_at");

-- CreateIndex
CREATE INDEX "body_measurement_logs_client_id_deleted_at_recorded_at_idx" ON "body_measurement_logs"("client_id", "deleted_at", "recorded_at");

-- CreateIndex
CREATE INDEX "body_measurement_logs_recorded_by_member_id_idx" ON "body_measurement_logs"("recorded_by_member_id");

-- AddForeignKey
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_recorded_by_member_id_fkey" FOREIGN KEY ("recorded_by_member_id") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurement_logs" ADD CONSTRAINT "body_measurement_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurement_logs" ADD CONSTRAINT "body_measurement_logs_recorded_by_member_id_fkey" FOREIGN KEY ("recorded_by_member_id") REFERENCES "organization_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
