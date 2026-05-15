-- CreateEnum
CREATE TYPE "ClientOperationalStatus" AS ENUM ('active', 'paused', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('presential', 'online', 'hybrid');

-- CreateEnum
CREATE TYPE "ClientAccessStatus" AS ENUM ('active', 'temporarily_locked', 'disabled');

-- CreateEnum
CREATE TYPE "FollowUpNoteVisibility" AS ENUM ('private', 'visible_to_client');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "assigned_coach_member_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "age" INTEGER,
    "sex" TEXT,
    "client_type" "ClientType" NOT NULL,
    "main_goal" TEXT NOT NULL,
    "height_cm" DOUBLE PRECISION NOT NULL,
    "initial_weight_kg" DOUBLE PRECISION NOT NULL,
    "training_level" TEXT,
    "injuries_notes" TEXT,
    "general_notes" TEXT,
    "can_register_weight" BOOLEAN NOT NULL DEFAULT false,
    "operational_status" "ClientOperationalStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_accesses" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "token_hash" TEXT,
    "status" "ClientAccessStatus" NOT NULL DEFAULT 'active',
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_access_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_notes" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "created_by_member_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "visibility" "FollowUpNoteVisibility" NOT NULL DEFAULT 'private',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_accesses_client_id_key" ON "client_accesses"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_accesses_token_hash_key" ON "client_accesses"("token_hash");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_coach_member_id_fkey" FOREIGN KEY ("assigned_coach_member_id") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_accesses" ADD CONSTRAINT "client_accesses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_notes" ADD CONSTRAINT "follow_up_notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_notes" ADD CONSTRAINT "follow_up_notes_created_by_member_id_fkey" FOREIGN KEY ("created_by_member_id") REFERENCES "organization_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
