-- CreateEnum
CREATE TYPE "ExerciseStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "ExerciseMediaType" AS ENUM ('image', 'video_url');

-- CreateEnum
CREATE TYPE "PrimaryMuscle" AS ENUM (
    'chest',
    'back',
    'legs',
    'shoulder',
    'biceps',
    'triceps',
    'core',
    'glute'
);

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM (
    'barbell',
    'dumbbell',
    'cable',
    'machine',
    'bodyweight',
    'other'
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "created_by_user_id" TEXT,
    "name" TEXT NOT NULL,
    "primary_muscle" "PrimaryMuscle" NOT NULL,
    "secondary_muscles" TEXT[],
    "equipment" "Equipment" NOT NULL,
    "instructions" TEXT,
    "recommendations" TEXT,
    "media_url" TEXT,
    "media_type" "ExerciseMediaType",
    "status" "ExerciseStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercises_name_organization_id_key" ON "exercises"("name", "organization_id");

-- CreateIndex
CREATE INDEX "exercises_organization_id_idx" ON "exercises"("organization_id");

-- CreateIndex
CREATE INDEX "exercises_status_idx" ON "exercises"("status");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma cannot express partial unique indexes. This enforces unique global
-- exercise names while still allowing the same name inside different orgs.
-- CreateIndex
CREATE UNIQUE INDEX "exercises_global_name_key"
ON "exercises"("name")
WHERE "organization_id" IS NULL;
