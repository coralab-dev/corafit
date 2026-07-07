/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DayOfWeek,
  ExerciseStatus,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
  TrainingDayType,
  TrainingPlanStatus,
  TrainingPlanType,
  UserPlatformRole,
  UserStatus,
} from '../src/generated/prisma/client';
import { createPrismaClient } from '../src/prisma-client';
import {
  type CanonicalExerciseSeed,
  isCanonicalGlobalExerciseSeedRow,
  validateCanonicalExercises,
  validateTemplateExerciseNames,
} from './seed-canonical-exercises';

config({ path: resolve(process.cwd(), '../../.env') });
config();

// ── System constants ─────────────────────────────────────────────────────────
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
const SEED_ORG_ID = '00000000-0000-0000-0000-000000000002';
const SYSTEM_MEMBER_ID = '00000000-0000-0000-0000-000000000003';

const PLAN_1_ID = '00000000-0000-0000-0000-000000000004';
const PLAN_2_ID = '00000000-0000-0000-0000-000000000005';
const canonicalExercisesPath = resolve(
  process.cwd(),
  'prisma/seeds/global-exercises.seed.json',
);

// ── Plan definitions ─────────────────────────────────────────────────────────

interface ExerciseDef {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  coachNote?: string;
  alternatives?: { name: string; note?: string }[];
}

interface SessionDef {
  name: string;
  description?: string;
  coachNote?: string;
  exercises: ExerciseDef[];
}

interface DayDef {
  dayOfWeek: DayOfWeek;
  session: SessionDef;
}

interface WeekDef {
  weekNumber: number;
  days: DayDef[];
}

interface PlanDef {
  id: string;
  name: string;
  goal: string;
  level: string;
  durationWeeks: number;
  generalNotes?: string;
  weeks: WeekDef[];
}

const beginnerDays: DayDef[] = [
  {
    dayOfWeek: DayOfWeek.monday,
    session: {
      name: 'Full Body A',
      description: 'Base de sentadilla, empuje horizontal y espalda.',
      exercises: [
        { name: 'Sentadilla con barra', sets: 3, reps: '10', restSeconds: 90 },
        { name: 'Press de banca con barra', sets: 3, reps: '10', restSeconds: 90 },
        { name: 'Remo con barra', sets: 3, reps: '10', restSeconds: 75 },
        { name: 'Hip thrust en m\u00e1quina', sets: 3, reps: '12', restSeconds: 75 },
        { name: 'Plancha', sets: 3, reps: '30s', restSeconds: 60 },
      ],
    },
  },
  {
    dayOfWeek: DayOfWeek.wednesday,
    session: {
      name: 'Full Body B',
      description: 'Variante unilateral, empuje inclinado y jal\u00f3n.',
      exercises: [
        { name: 'Sentadilla bulgara con barra', sets: 3, reps: '10', restSeconds: 90 },
        { name: 'Press inclinado con mancuernas', sets: 3, reps: '10', restSeconds: 90 },
        { name: 'Jal\u00f3n al pecho prono', sets: 3, reps: '12', restSeconds: 75 },
        { name: 'Zancadas con mancuerna', sets: 3, reps: '12', restSeconds: 75 },
        { name: 'Crunch en maquina', sets: 3, reps: '15', restSeconds: 60 },
      ],
    },
  },
  {
    dayOfWeek: DayOfWeek.friday,
    session: {
      name: 'Full Body C',
      description: 'Bisagra de cadera, peso corporal y estabilidad.',
      exercises: [
        { name: 'Peso muerto rumano con mancuernas', sets: 3, reps: '10', restSeconds: 90 },
        { name: 'Flexiones', sets: 3, reps: '12', restSeconds: 75 },
        { name: 'Remo T con respaldo', sets: 3, reps: '12', restSeconds: 75 },
        { name: 'Abducci\u00f3n en m\u00e1quina', sets: 3, reps: '15', restSeconds: 60 },
        { name: 'Plancha', sets: 3, reps: '35s', restSeconds: 60 },
      ],
    },
  },
];

const hypertrophyDays: DayDef[] = [
  {
    dayOfWeek: DayOfWeek.monday,
    session: {
      name: 'Push',
      description: 'Pecho, hombros y tr\u00edceps.',
      exercises: [
        { name: 'Press de banca con barra', sets: 4, reps: '8', restSeconds: 120 },
        { name: 'Press inclinado con mancuernas', sets: 3, reps: '10', restSeconds: 90 },
        { name: 'Press militar con barra', sets: 3, reps: '8', restSeconds: 90 },
        { name: 'Elevaciones laterales con mancuernas', sets: 4, reps: '12', restSeconds: 60 },
        { name: 'Extensi\u00f3n de tr\u00edceps en polea', sets: 3, reps: '12', restSeconds: 60 },
        { name: 'Fondos en paralelas', sets: 3, reps: '8', restSeconds: 75 },
      ],
    },
  },
  {
    dayOfWeek: DayOfWeek.tuesday,
    session: {
      name: 'Pull',
      description: 'Espalda, b\u00edceps y deltoides posteriores.',
      exercises: [
        { name: 'Dominadas', sets: 4, reps: '6-8', restSeconds: 120 },
        { name: 'Remo con barra', sets: 4, reps: '8', restSeconds: 120 },
        { name: 'Jal\u00f3n al pecho prono', sets: 3, reps: '10', restSeconds: 90 },
        { name: 'Face pull en polea', sets: 3, reps: '15', restSeconds: 60 },
        { name: 'Curl con barra', sets: 3, reps: '10', restSeconds: 60 },
        { name: 'Curl martillo', sets: 3, reps: '12', restSeconds: 60 },
      ],
    },
  },
  {
    dayOfWeek: DayOfWeek.thursday,
    session: {
      name: 'Pierna',
      description: 'Cu\u00e1driceps, femorales, gl\u00fateos y gemelos.',
      exercises: [
        { name: 'Sentadilla con barra', sets: 4, reps: '8', restSeconds: 150 },
        { name: 'Peso muerto rumano con barra', sets: 4, reps: '8', restSeconds: 150 },
        { name: 'Prensa en maquina', sets: 3, reps: '10', restSeconds: 120 },
        { name: 'Curl femoral sentado', sets: 3, reps: '12', restSeconds: 75 },
        { name: 'Hip thrust en m\u00e1quina', sets: 3, reps: '10', restSeconds: 90 },
        { name: 'Gemelos de pie', sets: 4, reps: '15', restSeconds: 60 },
      ],
    },
  },
  {
    dayOfWeek: DayOfWeek.friday,
    session: {
      name: 'Upper accesorios',
      description: 'Volumen complementario de torso y core.',
      exercises: [
        { name: 'Aperturas en m\u00e1quina peck deck', sets: 3, reps: '12', restSeconds: 60 },
        { name: 'Remo T con respaldo', sets: 3, reps: '12', restSeconds: 75 },
        { name: 'Elevaciones laterales con mancuernas', sets: 3, reps: '15', restSeconds: 60 },
        { name: 'Extensi\u00f3n de tr\u00edceps en polea', sets: 3, reps: '12', restSeconds: 60 },
        { name: 'Curl martillo', sets: 3, reps: '12', restSeconds: 60 },
        { name: 'Plancha', sets: 3, reps: '45s', restSeconds: 60 },
      ],
    },
  },
];

function buildWeeks(days: DayDef[], durationWeeks: number): WeekDef[] {
  return Array.from({ length: durationWeeks }, (_, index) => ({
    weekNumber: index + 1,
    days,
  }));
}

const PLAN_1: PlanDef = {
  id: PLAN_1_ID,
  name: 'Principiante Full Body 3 d\u00edas',
  goal: 'Base de fuerza, t\u00e9cnica y condici\u00f3n general',
  level: 'beginner',
  durationWeeks: 4,
  generalNotes:
    'Plan can\u00f3nico beta para principiantes. Prioriza t\u00e9cnica, control y progresi\u00f3n moderada.',
  weeks: buildWeeks(beginnerDays, 4),
};

const PLAN_2: PlanDef = {
  id: PLAN_2_ID,
  name: 'Intermedio Hipertrofia Dividido',
  goal: 'Hipertrofia con divisi\u00f3n push, pull, pierna y accesorios',
  level: 'intermediate',
  durationWeeks: 4,
  generalNotes:
    'Plan can\u00f3nico beta para nivel intermedio. Aumenta cargas de forma progresiva y conserva t\u00e9cnica.',
  weeks: buildWeeks(hypertrophyDays, 4),
};

export const CANONICAL_TEMPLATE_PLANS = [PLAN_1, PLAN_2] as const;

export function readCanonicalExerciseSeeds() {
  return validateCanonicalExercises(
    JSON.parse(readFileSync(canonicalExercisesPath, 'utf8')),
  );
}

export function collectPlanExerciseNames(plans: readonly PlanDef[]) {
  const names = new Set<string>();

  for (const plan of plans) {
    for (const week of plan.weeks) {
      for (const day of week.days) {
        for (const exercise of day.session.exercises) {
          names.add(exercise.name);
          for (const alternative of exercise.alternatives ?? []) {
            names.add(alternative.name);
          }
        }
      }
    }
  }

  return [...names];
}

async function seedCanonicalExercises(
  // biome-ignore lint/suspicious/noExplicitAny: Prisma client in seed script
  prisma: any,
  exercises: CanonicalExerciseSeed[],
) {
  let createdCount = 0;
  let updatedCount = 0;
  let duplicateNameCount = 0;

  for (const exercise of exercises) {
    const existingExercises = await prisma.exercise.findMany({
      where: { name: exercise.name, organizationId: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    const existing = existingExercises[0] as { id: string } | undefined;

    if (existingExercises.length > 1) {
      duplicateNameCount += existingExercises.length - 1;
      console.warn(
        `Canonical exercise "${exercise.name}" has ${existingExercises.length} global rows; updating the oldest and leaving duplicates untouched.`,
      );
    }

    const data = {
      ...exercise,
      status: ExerciseStatus.active,
      organizationId: null,
    };

    if (existing) {
      await prisma.exercise.update({
        where: { id: existing.id },
        data,
      });
      updatedCount++;
    } else {
      await prisma.exercise.create({ data });
      createdCount++;
    }
  }

  return { createdCount, duplicateNameCount, updatedCount };
}

async function deleteNonCanonicalGlobalExercises(
  // biome-ignore lint/suspicious/noExplicitAny: Prisma client in seed script
  prisma: any,
  canonicalExerciseNames: Set<string>,
) {
  const activeGlobalExercises = await prisma.exercise.findMany({
    where: {
      organizationId: null,
      status: ExerciseStatus.active,
    },
    select: {
      id: true,
      mediaType: true,
      mediaUrl: true,
      name: true,
    },
  });
  const nonCanonicalExerciseIds = activeGlobalExercises
    .filter(
      (exercise: { mediaType: string | null; mediaUrl: string | null; name: string }) =>
        !isCanonicalGlobalExerciseSeedRow(exercise, canonicalExerciseNames),
    )
    .map((exercise: { id: string }) => exercise.id);

  if (!nonCanonicalExerciseIds.length) {
    return 0;
  }

  const result = await prisma.exercise.deleteMany({
    where: {
      id: { in: nonCanonicalExerciseIds },
      organizationId: null,
      status: ExerciseStatus.active,
    },
  });

  return Number(result.count);
}

async function findExerciseByName(
  // biome-ignore lint/suspicious/noExplicitAny: Prisma client in seed script
  prisma: any,
  name: string,
  canonicalExerciseNames: Set<string>,
) {
  if (!canonicalExerciseNames.has(name)) {
    throw new Error(`Template exercise is not in canonical seed: ${name}`);
  }

  const exercise = await prisma.exercise.findFirst({
    where: { name, organizationId: null },
    orderBy: { createdAt: 'asc' },
  });
  if (!exercise) {
    throw new Error(`Exercise not found: ${name}`);
  }
  return exercise;
}

async function clearPlanChildren(
  // biome-ignore lint/suspicious/noExplicitAny: Prisma client in seed script
  prisma: any,
  planId: string,
) {
  const weeks = await prisma.trainingPlanWeek.findMany({
    where: { trainingPlanId: planId },
    select: { id: true },
  });
  const weekIds = weeks.map((w: { id: string }) => w.id);

  const days = await prisma.trainingPlanDay.findMany({
    where: { trainingPlanWeekId: { in: weekIds } },
    select: { id: true },
  });
  const dayIds = days.map((d: { id: string }) => d.id);

  const sessions = await prisma.trainingSession.findMany({
    where: { trainingPlanDayId: { in: dayIds } },
    select: { id: true },
  });
  const sessionIds = sessions.map((s: { id: string }) => s.id);

  const exercises = await prisma.sessionExercise.findMany({
    where: { trainingSessionId: { in: sessionIds } },
    select: { id: true },
  });
  const exerciseIds = exercises.map((e: { id: string }) => e.id);

  await prisma.$transaction([
    prisma.sessionExerciseAlternative.deleteMany({
      where: { sessionExerciseId: { in: exerciseIds } },
    }),
    prisma.sessionExercise.deleteMany({
      where: { id: { in: exerciseIds } },
    }),
    prisma.trainingSession.deleteMany({
      where: { id: { in: sessionIds } },
    }),
    prisma.trainingPlanDay.deleteMany({
      where: { id: { in: dayIds } },
    }),
    prisma.trainingPlanWeek.deleteMany({
      where: { id: { in: weekIds } },
    }),
  ]);
}

async function seedTrainingPlan(
  // biome-ignore lint/suspicious/noExplicitAny: Prisma client in seed script
  prisma: any,
  planDef: PlanDef,
  memberId: string,
  orgId: string,
  canonicalExerciseNames: Set<string>,
) {
  const existingPlan = await prisma.trainingPlan.findUnique({
    where: { id: planDef.id },
  });

  if (existingPlan) {
    await clearPlanChildren(prisma, planDef.id);
    await prisma.trainingPlan.update({
      where: { id: planDef.id },
      data: {
        name: planDef.name,
        goal: planDef.goal,
        level: planDef.level,
        durationWeeks: planDef.durationWeeks,
        generalNotes: planDef.generalNotes ?? null,
        status: TrainingPlanStatus.active,
        planType: TrainingPlanType.template,
        organizationId: orgId,
        createdByMemberId: memberId,
      },
    });
  } else {
    await prisma.trainingPlan.create({
      data: {
        id: planDef.id,
        name: planDef.name,
        goal: planDef.goal,
        level: planDef.level,
        durationWeeks: planDef.durationWeeks,
        generalNotes: planDef.generalNotes ?? null,
        status: TrainingPlanStatus.active,
        planType: TrainingPlanType.template,
        organizationId: orgId,
        createdByMemberId: memberId,
      },
    });
  }

  for (const weekDef of planDef.weeks) {
    const week = await prisma.trainingPlanWeek.create({
      data: {
        trainingPlanId: planDef.id,
        weekNumber: weekDef.weekNumber,
      },
    });

    for (const dayDef of weekDef.days) {
      const day = await prisma.trainingPlanDay.create({
        data: {
          trainingPlanWeekId: week.id,
          dayOfWeek: dayDef.dayOfWeek,
          dayType: TrainingDayType.training,
        },
      });

      const session = await prisma.trainingSession.create({
        data: {
          trainingPlanDayId: day.id,
          name: dayDef.session.name,
          description: dayDef.session.description ?? null,
          coachNote: dayDef.session.coachNote ?? null,
        },
      });

      for (let i = 0; i < dayDef.session.exercises.length; i++) {
        const exDef = dayDef.session.exercises[i];
        const exercise = await findExerciseByName(
          prisma,
          exDef.name,
          canonicalExerciseNames,
        );

        const sessionExercise = await prisma.sessionExercise.create({
          data: {
            trainingSessionId: session.id,
            exerciseId: exercise.id,
            orderIndex: i,
            sets: exDef.sets,
            reps: exDef.reps,
            restSeconds: exDef.restSeconds,
            coachNote: exDef.coachNote ?? null,
          },
        });

        if (exDef.alternatives) {
          for (const altDef of exDef.alternatives) {
            const altExercise = await findExerciseByName(
              prisma,
              altDef.name,
              canonicalExerciseNames,
            );
            await prisma.sessionExerciseAlternative.create({
              data: {
                sessionExerciseId: sessionExercise.id,
                alternativeExerciseId: altExercise.id,
                note: altDef.note ?? null,
              },
            });
          }
        }
      }
    }
  }
}

async function clearObsoleteSeedTemplates(
  // biome-ignore lint/suspicious/noExplicitAny: Prisma client in seed script
  prisma: any,
) {
  const canonicalTemplateIds = CANONICAL_TEMPLATE_PLANS.map((plan) => plan.id);
  const obsoleteTemplates = await prisma.trainingPlan.findMany({
    where: {
      organizationId: SEED_ORG_ID,
      planType: TrainingPlanType.template,
      id: { notIn: canonicalTemplateIds },
    },
    select: { id: true, name: true },
  });

  for (const template of obsoleteTemplates) {
    const templateId = String(template.id);
    await clearPlanChildren(prisma, templateId);
    await prisma.trainingPlan.delete({ where: { id: templateId } });
    console.log(`Removed obsolete seed template: ${String(template.name)}`);
  }

  return obsoleteTemplates.length;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const prisma = createPrismaClient();
  const canonicalExercises = readCanonicalExerciseSeeds();
  const canonicalExerciseNames = new Set(
    canonicalExercises.map((exercise) => exercise.name),
  );
  validateTemplateExerciseNames(
    collectPlanExerciseNames(CANONICAL_TEMPLATE_PLANS),
    canonicalExercises,
  );

  const exerciseSeedSummary = await seedCanonicalExercises(prisma, canonicalExercises);
  const deletedNonCanonicalExercises = await deleteNonCanonicalGlobalExercises(
    prisma,
    canonicalExerciseNames,
  );
  console.log(
    `Exercises seed: ${exerciseSeedSummary.createdCount} created, ${exerciseSeedSummary.updatedCount} updated`,
  );
  console.log(
    `Exercises seed: ${deletedNonCanonicalExercises} non-canonical global active exercises deleted`,
  );
  if (exerciseSeedSummary.duplicateNameCount) {
    console.warn(
      `Exercises seed: ${exerciseSeedSummary.duplicateNameCount} duplicate global rows left untouched`,
    );
  }

  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    update: {
      name: 'Sistema',
      email: 'system@corafit.local',
      status: UserStatus.active,
      platformRole: UserPlatformRole.admin_saas,
    },
    create: {
      id: SYSTEM_USER_ID,
      supabaseUserId: 'system-seed-user',
      name: 'Sistema',
      email: 'system@corafit.local',
      status: UserStatus.active,
      platformRole: UserPlatformRole.admin_saas,
    },
  });

  await prisma.organization.upsert({
    where: { id: SEED_ORG_ID },
    update: {
      name: 'CoraFit Semilla',
      status: OrganizationStatus.active,
      type: OrganizationType.studio,
      timezone: 'America/Mexico_City',
    },
    create: {
      id: SEED_ORG_ID,
      name: 'CoraFit Semilla',
      status: OrganizationStatus.active,
      type: OrganizationType.studio,
      timezone: 'America/Mexico_City',
      ownerUserId: SYSTEM_USER_ID,
    },
  });

  await prisma.organizationMember.upsert({
    where: { id: SYSTEM_MEMBER_ID },
    update: {
      role: OrganizationMemberRole.owner,
      status: OrganizationMemberStatus.active,
    },
    create: {
      id: SYSTEM_MEMBER_ID,
      organizationId: SEED_ORG_ID,
      userId: SYSTEM_USER_ID,
      role: OrganizationMemberRole.owner,
      status: OrganizationMemberStatus.active,
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'system.seedOrganizationId' },
    update: { value: SEED_ORG_ID },
    create: {
      key: 'system.seedOrganizationId',
      value: SEED_ORG_ID,
    },
  });

  const removedTemplates = await clearObsoleteSeedTemplates(prisma);
  await seedTrainingPlan(
    prisma,
    PLAN_1,
    SYSTEM_MEMBER_ID,
    SEED_ORG_ID,
    canonicalExerciseNames,
  );
  await seedTrainingPlan(
    prisma,
    PLAN_2,
    SYSTEM_MEMBER_ID,
    SEED_ORG_ID,
    canonicalExerciseNames,
  );

  console.log(
    `Training plans seed: 2 base templates ensured, ${removedTemplates} obsolete seed templates removed`,
  );

  await prisma.$disconnect();
}

if (require.main === module) {
  void main();
}
