import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workspaceRoot = resolve(__dirname, '../../../../..');
const schemaPath = resolve(workspaceRoot, 'packages/db/prisma/schema.prisma');
const migrationPath = resolve(
  workspaceRoot,
  'packages/db/prisma/migrations/20260516031615_add_training_plan_models/migration.sql',
);

const schema = readFileSync(schemaPath, 'utf8');
const migration = readFileSync(migrationPath, 'utf8');

describe('training plan Prisma schema', () => {
  it('keeps the required plan enums and model names', () => {
    expect(schema).toContain('enum TrainingPlanStatus');
    expect(schema).toContain('enum TrainingPlanType');
    expect(schema).toContain('enum TrainingDayType');
    expect(schema).toContain('enum DayOfWeek');
    expect(schema).toContain('enum ClientTrainingPlanAssignmentStatus');
    expect(schema).toContain('enum ClientSessionStatus');

    expect(schema).toContain('model TrainingPlan');
    expect(schema).toContain('model TrainingPlanWeek');
    expect(schema).toContain('model TrainingPlanDay');
    expect(schema).toContain('model TrainingSession');
    expect(schema).toContain('model SessionExercise');
    expect(schema).toContain('model SessionExerciseAlternative');
    expect(schema).toContain('model ClientTrainingPlanAssignment');
    expect(schema).toContain('model ClientSessionLog');
  });

  it('keeps the assignment model fields and map', () => {
    expect(schema).toContain('model ClientTrainingPlanAssignment');
    expect(schema).toContain('@@map("client_training_plan_assignments")');
    expect(schema).toContain('sourceTrainingPlanId');
    expect(schema).toContain('assignedPlanId');
    expect(schema).toContain('assignedByMemberId');
    expect(schema).toContain('startDate');
    expect(schema).toContain('endedAt');
    expect(schema).toContain('status');
  });

  it('keeps the client session log model fields and allowed statuses', () => {
    expect(schema).toContain('enum ClientSessionStatus');
    expect(schema).toContain('opened');
    expect(schema).toContain('in_progress');
    expect(schema).toContain('completed');
    expect(schema).toContain('partially_completed');
    expect(schema).not.toMatch(/enum ClientSessionStatus\s*{[^}]*pending[^}]*}/);

    expect(schema).toContain('model ClientSessionLog');
    expect(schema).toContain('@@map("client_session_logs")');
    expect(schema).toContain('clientId');
    expect(schema).toContain('assignmentId');
    expect(schema).toContain('trainingSessionId');
    expect(schema).toContain('scheduledDate');
    expect(schema).toContain('snapshotData');
    expect(schema).toContain('status            ClientSessionStatus @default(opened)');
  });

  it('keeps the MVP uniqueness constraints for plan structure', () => {
    expect(schema).toContain('@@unique([trainingPlanId, weekNumber])');
    expect(schema).toContain('@@unique([trainingPlanWeekId, dayOfWeek])');
    expect(schema).toContain('trainingPlanDayId String   @unique');
    expect(schema).toContain('@@unique([trainingSessionId, orderIndex])');
    expect(schema).toContain('@@index([sessionExerciseId])');
  });

  it('keeps explicit delete behavior for required and nullable relations', () => {
    expect(schema).toContain('fields: [organizationId], references: [id], onDelete: Restrict');
    expect(schema).toContain('fields: [createdByMemberId], references: [id], onDelete: Restrict');
    expect(schema).toContain('fields: [sourcePlanId], references: [id], onDelete: SetNull');
    expect(schema).toContain('fields: [assignedClientId], references: [id], onDelete: SetNull');
    expect(schema).toContain('fields: [trainingPlanId], references: [id], onDelete: Restrict');
    expect(schema).toContain('fields: [trainingPlanWeekId], references: [id], onDelete: Restrict');
    expect(schema).toContain('fields: [trainingPlanDayId], references: [id], onDelete: Restrict');
    expect(schema).toContain('fields: [trainingSessionId], references: [id], onDelete: Restrict');
    expect(schema).toContain('fields: [exerciseId], references: [id], onDelete: Restrict');
    expect(schema).toContain('fields: [sessionExerciseId], references: [id], onDelete: Restrict');
    expect(schema).toContain('fields: [alternativeExerciseId], references: [id], onDelete: Restrict');
    expect(schema).toContain('fields: [clientId], references: [id], onDelete: Restrict');
    expect(schema).toContain('fields: [sourceTrainingPlanId], references: [id], onDelete: Restrict');
    expect(schema).toContain('fields: [assignedPlanId], references: [id], onDelete: Restrict');
    expect(schema).toContain('fields: [assignedByMemberId], references: [id], onDelete: Restrict');
  });

  it('keeps the generated migration aligned with the key database constraints', () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "training_plan_weeks_training_plan_id_week_number_key"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "training_plan_days_training_plan_week_id_day_of_week_key"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "session_exercises_training_session_id_order_index_key"',
    );
    expect(migration).toContain(
      'CREATE INDEX "session_exercise_alternatives_session_exercise_id_idx"',
    );
    expect(migration).toContain('ON DELETE SET NULL');
    expect(migration).toContain('ON DELETE RESTRICT');
  });
});

describe('client session logs migration', () => {
  const clientSessionLogsMigrationPath = resolve(
    workspaceRoot,
    'packages/db/prisma/migrations/20260529000000_add_client_session_logs/migration.sql',
  );
  const clientSessionLogsMigration = readFileSync(
    clientSessionLogsMigrationPath,
    'utf8',
  );

  it('creates the client session status enum without pending', () => {
    expect(clientSessionLogsMigration).toContain(
      'CREATE TYPE "ClientSessionStatus"',
    );
    expect(clientSessionLogsMigration).toContain("'opened'");
    expect(clientSessionLogsMigration).toContain("'in_progress'");
    expect(clientSessionLogsMigration).toContain("'completed'");
    expect(clientSessionLogsMigration).toContain("'partially_completed'");
    expect(clientSessionLogsMigration).not.toContain("'pending'");
  });

  it('creates the client session logs table with required fields', () => {
    expect(clientSessionLogsMigration).toContain(
      'CREATE TABLE "client_session_logs"',
    );
    expect(clientSessionLogsMigration).toContain('"client_id" TEXT NOT NULL');
    expect(clientSessionLogsMigration).toContain('"assignment_id" TEXT NOT NULL');
    expect(clientSessionLogsMigration).toContain(
      '"training_session_id" TEXT NOT NULL',
    );
    expect(clientSessionLogsMigration).toContain(
      '"scheduled_date" TIMESTAMP(3) NOT NULL',
    );
    expect(clientSessionLogsMigration).toContain(
      '"status" "ClientSessionStatus" NOT NULL DEFAULT \'opened\'',
    );
    expect(clientSessionLogsMigration).toContain('"snapshot_data" JSONB');
  });

  it('adds indexes for idempotent open and common lookups', () => {
    expect(clientSessionLogsMigration).toContain(
      'CREATE UNIQUE INDEX "client_session_logs_client_assignment_session_date_key"',
    );
    expect(clientSessionLogsMigration).toContain(
      'CREATE INDEX "client_session_logs_client_id_scheduled_date_idx"',
    );
    expect(clientSessionLogsMigration).toContain(
      'CREATE INDEX "client_session_logs_assignment_id_idx"',
    );
    expect(clientSessionLogsMigration).toContain(
      'CREATE INDEX "client_session_logs_training_session_id_idx"',
    );
    expect(clientSessionLogsMigration).toContain(
      'CREATE INDEX "client_session_logs_status_idx"',
    );
  });

  it('adds foreign keys with restrict on delete', () => {
    expect(clientSessionLogsMigration).toContain(
      'REFERENCES "clients"("id") ON DELETE RESTRICT',
    );
    expect(clientSessionLogsMigration).toContain(
      'REFERENCES "client_training_plan_assignments"("id") ON DELETE RESTRICT',
    );
    expect(clientSessionLogsMigration).toContain(
      'REFERENCES "training_sessions"("id") ON DELETE RESTRICT',
    );
  });
});

describe('assignment migration', () => {
  const assignmentMigrationPath = resolve(
    workspaceRoot,
    'packages/db/prisma/migrations/20260517000000_add_assignment_model/migration.sql',
  );
  const assignmentMigration = readFileSync(assignmentMigrationPath, 'utf8');

  it('creates the assignment status enum', () => {
    expect(assignmentMigration).toContain(
      'CREATE TYPE "ClientTrainingPlanAssignmentStatus"',
    );
    expect(assignmentMigration).toContain("'active'");
    expect(assignmentMigration).toContain("'finished'");
    expect(assignmentMigration).toContain("'removed'");
  });

  it('creates the assignment table with required fields', () => {
    expect(assignmentMigration).toContain(
      'CREATE TABLE "client_training_plan_assignments"',
    );
    expect(assignmentMigration).toContain('"client_id" TEXT NOT NULL');
    expect(assignmentMigration).toContain('"source_training_plan_id" TEXT NOT NULL');
    expect(assignmentMigration).toContain('"assigned_plan_id" TEXT NOT NULL');
    expect(assignmentMigration).toContain('"assigned_by_member_id" TEXT NOT NULL');
    expect(assignmentMigration).toContain('"start_date" TIMESTAMP(3) NOT NULL');
    expect(assignmentMigration).toContain('"ended_at" TIMESTAMP(3)');
  });

  it('adds a partial unique index for one active assignment per client', () => {
    expect(assignmentMigration).toContain(
      'CREATE UNIQUE INDEX "client_training_plan_assignments_client_id_active_key"',
    );
    expect(assignmentMigration).toContain('WHERE "status" = \'active\'');
  });

  it('adds foreign keys with restrict on delete', () => {
    expect(assignmentMigration).toContain(
      'REFERENCES "clients"("id") ON DELETE RESTRICT',
    );
    expect(assignmentMigration).toContain(
      'REFERENCES "training_plans"("id") ON DELETE RESTRICT',
    );
    expect(assignmentMigration).toContain(
      'REFERENCES "organization_members"("id") ON DELETE RESTRICT',
    );
  });
});
