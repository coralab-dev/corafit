-- CreateEnum
CREATE TYPE "TrainingPlanStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "TrainingPlanType" AS ENUM ('template', 'assigned_copy');

-- CreateEnum
CREATE TYPE "TrainingDayType" AS ENUM ('training', 'rest');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateTable
CREATE TABLE "training_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_member_id" TEXT NOT NULL,
    "plan_type" "TrainingPlanType" NOT NULL DEFAULT 'template',
    "source_plan_id" TEXT,
    "assigned_client_id" TEXT,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "level" TEXT,
    "duration_weeks" INTEGER NOT NULL,
    "general_notes" TEXT,
    "status" "TrainingPlanStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_plan_weeks" (
    "id" TEXT NOT NULL,
    "training_plan_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_plan_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_plan_days" (
    "id" TEXT NOT NULL,
    "training_plan_week_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "day_order" INTEGER,
    "day_type" "TrainingDayType" NOT NULL DEFAULT 'training',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_plan_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL,
    "training_plan_day_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coach_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_exercises" (
    "id" TEXT NOT NULL,
    "training_session_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "sets" INTEGER,
    "reps" TEXT NOT NULL,
    "rest_seconds" INTEGER,
    "coach_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_exercise_alternatives" (
    "id" TEXT NOT NULL,
    "session_exercise_id" TEXT NOT NULL,
    "alternative_exercise_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_exercise_alternatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "training_plan_weeks_training_plan_id_week_number_key" ON "training_plan_weeks"("training_plan_id", "week_number");

-- CreateIndex
CREATE UNIQUE INDEX "training_plan_days_training_plan_week_id_day_of_week_key" ON "training_plan_days"("training_plan_week_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "training_sessions_training_plan_day_id_key" ON "training_sessions"("training_plan_day_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_exercises_training_session_id_order_index_key" ON "session_exercises"("training_session_id", "order_index");

-- CreateIndex
CREATE INDEX "session_exercise_alternatives_session_exercise_id_idx" ON "session_exercise_alternatives"("session_exercise_id");

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_created_by_member_id_fkey" FOREIGN KEY ("created_by_member_id") REFERENCES "organization_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_source_plan_id_fkey" FOREIGN KEY ("source_plan_id") REFERENCES "training_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_assigned_client_id_fkey" FOREIGN KEY ("assigned_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plan_weeks" ADD CONSTRAINT "training_plan_weeks_training_plan_id_fkey" FOREIGN KEY ("training_plan_id") REFERENCES "training_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plan_days" ADD CONSTRAINT "training_plan_days_training_plan_week_id_fkey" FOREIGN KEY ("training_plan_week_id") REFERENCES "training_plan_weeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_training_plan_day_id_fkey" FOREIGN KEY ("training_plan_day_id") REFERENCES "training_plan_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_training_session_id_fkey" FOREIGN KEY ("training_session_id") REFERENCES "training_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercise_alternatives" ADD CONSTRAINT "session_exercise_alternatives_session_exercise_id_fkey" FOREIGN KEY ("session_exercise_id") REFERENCES "session_exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercise_alternatives" ADD CONSTRAINT "session_exercise_alternatives_alternative_exercise_id_fkey" FOREIGN KEY ("alternative_exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
