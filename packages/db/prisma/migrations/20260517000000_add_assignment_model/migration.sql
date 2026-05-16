-- CreateEnum
CREATE TYPE "ClientTrainingPlanAssignmentStatus" AS ENUM ('active', 'finished', 'removed');

-- CreateTable
CREATE TABLE "client_training_plan_assignments" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "source_training_plan_id" TEXT NOT NULL,
    "assigned_plan_id" TEXT NOT NULL,
    "assigned_by_member_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "status" "ClientTrainingPlanAssignmentStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_training_plan_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (partial unique for one active assignment per client)
CREATE UNIQUE INDEX "client_training_plan_assignments_client_id_active_key" ON "client_training_plan_assignments"("client_id") WHERE "status" = 'active';

-- AddForeignKey
ALTER TABLE "client_training_plan_assignments" ADD CONSTRAINT "client_training_plan_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_training_plan_assignments" ADD CONSTRAINT "client_training_plan_assignments_source_training_plan_id_fkey" FOREIGN KEY ("source_training_plan_id") REFERENCES "training_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_training_plan_assignments" ADD CONSTRAINT "client_training_plan_assignments_assigned_plan_id_fkey" FOREIGN KEY ("assigned_plan_id") REFERENCES "training_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_training_plan_assignments" ADD CONSTRAINT "client_training_plan_assignments_assigned_by_member_id_fkey" FOREIGN KEY ("assigned_by_member_id") REFERENCES "organization_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
