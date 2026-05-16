/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import {
  DayOfWeek,
  Equipment,
  ExerciseStatus,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
  PrimaryMuscle,
  TrainingDayType,
  TrainingPlanStatus,
  TrainingPlanType,
  UserPlatformRole,
  UserStatus,
} from '../src/generated/prisma/client';
import { createPrismaClient } from '../src/prisma-client';

config({ path: resolve(process.cwd(), '../../.env') });
config();

// ── System constants ─────────────────────────────────────────────────────────
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
const SEED_ORG_ID = '00000000-0000-0000-0000-000000000002';
const SYSTEM_MEMBER_ID = '00000000-0000-0000-0000-000000000003';

const PLAN_1_ID = '00000000-0000-0000-0000-000000000004';
const PLAN_2_ID = '00000000-0000-0000-0000-000000000005';

// ── Exercises ────────────────────────────────────────────────────────────────
const EXERCISES = [
  // Chest - 4 exercises
  {
    name: 'Press de banca con barra',
    primaryMuscle: PrimaryMuscle.chest,
    equipment: Equipment.barbell,
    instructions:
      'Acostado en banco plano, agarra la barra con agarre medio, baja hasta el pecho y empuja hacia arriba.',
    recommendations:
      'Mantén los pies firmes en el suelo y la espalda ligeramente arqueada.',
  },
  {
    name: 'Press inclinado con mancuernas',
    primaryMuscle: PrimaryMuscle.chest,
    equipment: Equipment.dumbbell,
    instructions:
      'En banco inclinado a 30-45 grados, sostén mancuernas y empuja hacia arriba desde el pecho.',
    recommendations:
      'Controla el descenso y mantén los codos a 45 grados del cuerpo.',
  },
  {
    name: 'Aperturas en máquina peck deck',
    primaryMuscle: PrimaryMuscle.chest,
    equipment: Equipment.machine,
    instructions:
      'Siéntate con la espalda apoyada, agarra los mangos y une las manos frente al pecho.',
    recommendations:
      'No bloquees los codos completamente al final del movimiento.',
  },
  {
    name: 'Flexiones de brazos',
    primaryMuscle: PrimaryMuscle.chest,
    equipment: Equipment.bodyweight,
    instructions:
      'En posición de plancha, baja el pecho hacia el suelo manteniendo el cuerpo recto y empuja hacia arriba.',
    recommendations:
      'Manos ligeramente más anchas que los hombros. Controla el descenso.',
  },

  // Back - 4 exercises
  {
    name: 'Dominadas',
    primaryMuscle: PrimaryMuscle.back,
    equipment: Equipment.bodyweight,
    instructions:
      'Cuelga de la barra con agarre prono, tira de tu pecho hacia la barra y baja controlado.',
    recommendations: 'Evita el balanceo o impulso. Aprieta los omóplatos al final.',
  },
  {
    name: 'Remo con barra',
    primaryMuscle: PrimaryMuscle.back,
    equipment: Equipment.barbell,
    instructions:
      'Inclinado a 45 grados, tira de la barra hacia tu abdomen bajo manteniendo la espalda recta.',
    recommendations: 'No redondees la espalda. Tira con los codos.',
  },
  {
    name: 'Jalón al pecho',
    primaryMuscle: PrimaryMuscle.back,
    equipment: Equipment.cable,
    instructions:
      'Sentado o de pie, tira de la barra hacia el pecho manteniendo los codos cerca del cuerpo.',
    recommendations: 'Aprieta los dorsales al final del movimiento.',
  },
  {
    name: 'Remo sentado en máquina',
    primaryMuscle: PrimaryMuscle.back,
    equipment: Equipment.machine,
    instructions:
      'Siéntate con los pies en los pedales, tira del mango hacia tu torso.',
    recommendations: 'Mantén el torso erguido y los codos cerca del cuerpo.',
  },

  // Legs - 4 exercises (at least 2 bodyweight)
  {
    name: 'Sentadilla con barra',
    primaryMuscle: PrimaryMuscle.legs,
    equipment: Equipment.barbell,
    instructions:
      'Barra en los trapecios, baja hasta que los muslos estén paralelos al suelo y sube.',
    recommendations: 'Rodillas siguen la línea de los pies. Mantén el pecho arriba.',
  },
  {
    name: 'Peso muerto rumano',
    primaryMuscle: PrimaryMuscle.legs,
    equipment: Equipment.barbell,
    instructions:
      'Con barra en manos, baja flexionando las rodillas ligeramente, manteniendo la espalda recta.',
    recommendations: 'Siente el estiramiento en los isquiotibiales. No redondees la espalda.',
  },
  {
    name: 'Sentadilla búlgara',
    primaryMuscle: PrimaryMuscle.legs,
    equipment: Equipment.bodyweight,
    instructions:
      'Con una pierna atrás elevada en banco, baja en sentadilla profunda y sube.',
    recommendations:
      'Mantén el torso erguido. La pierna delantera debe bajar de forma controlada.',
  },
  {
    name: 'Zancadas caminando',
    primaryMuscle: PrimaryMuscle.legs,
    equipment: Equipment.dumbbell,
    instructions:
      'Con mancuernas, da un paso largo adelante, baja hasta que ambos muslos estén paralelos y alterna.',
    recommendations:
      'Mantén el torso recto. Evita que la rodilla avanzada se pase de los dedos del pie.',
  },

  // Shoulder - 3 exercises
  {
    name: 'Press militar con barra',
    primaryMuscle: PrimaryMuscle.shoulder,
    equipment: Equipment.barbell,
    instructions:
      'De pie, barra a la altura de los hombros, empuja hacia arriba hasta extender los brazos.',
    recommendations: 'No arquees la espalda excesivamente. Activa el core.',
  },
  {
    name: 'Elevaciones laterales',
    primaryMuscle: PrimaryMuscle.shoulder,
    equipment: Equipment.dumbbell,
    instructions:
      'De pie con mancuernas a los lados, levanta los brazos lateralmente hasta la altura de los hombros.',
    recommendations: 'Con una leve flexión de codos. Evita subir demasiado alto.',
  },
  {
    name: 'Face pulls',
    primaryMuscle: PrimaryMuscle.shoulder,
    equipment: Equipment.cable,
    instructions:
      'Con polea alta y cuerda, tira hacia tu cara separando las manos al final.',
    recommendations: 'Mantén los codos altos. Enfócate en apretar los omóplatos.',
  },

  // Biceps - 2 exercises
  {
    name: 'Curl con barra',
    primaryMuscle: PrimaryMuscle.biceps,
    equipment: Equipment.barbell,
    instructions:
      'De pie con barra, flexiona los codos para llevar la barra hacia los hombros.',
    recommendations: 'No te balancees. Mantén los codos fijos a los lados.',
  },
  {
    name: 'Curl martillo',
    primaryMuscle: PrimaryMuscle.biceps,
    equipment: Equipment.dumbbell,
    instructions:
      'De pie con mancuernas, flexiona los codos llevando las pesas con las palmas enfrentándose.',
    recommendations: 'Movimiento controlado. No hiperestender al bajar.',
  },

  // Triceps - 2 exercises (at least 1 bodyweight)
  {
    name: 'Extensión de tríceps en polea',
    primaryMuscle: PrimaryMuscle.triceps,
    equipment: Equipment.cable,
    instructions:
      'Con cuerda o barra en polea alta, empuja hacia abajo extendiendo los brazos.',
    recommendations: 'Mantén los codos pegados al cuerpo. No bloquees completamente.',
  },
  {
    name: 'Fondos en paralelas',
    primaryMuscle: PrimaryMuscle.triceps,
    equipment: Equipment.bodyweight,
    instructions:
      'Apoyado en paralelas, baja flexionando los codos y empuja hacia arriba.',
    recommendations:
      'Inclina el torso ligeramente hacia adelante para más enfoque en tríceps.',
  },

  // Core - 2 exercises (at least 1 bodyweight)
  {
    name: 'Crunch en polea',
    primaryMuscle: PrimaryMuscle.core,
    equipment: Equipment.cable,
    instructions:
      'De rodillas frente a polea alta con barra, flexiona el core para bajar la barra.',
    recommendations: 'No jalar con los brazos. Usa solo el abdominal.',
  },
  {
    name: 'Plancha',
    primaryMuscle: PrimaryMuscle.core,
    equipment: Equipment.bodyweight,
    instructions:
      'En posición de plancha sobre codos y puntas de pies, mantén el cuerpo recto.',
    recommendations: 'No dejes caer la cadera. Aprieta glúteos y core.',
  },

  // Glute - 2 exercises (at least 1 bodyweight)
  {
    name: 'Hip thrust con barra',
    primaryMuscle: PrimaryMuscle.glute,
    equipment: Equipment.barbell,
    instructions:
      'Espalda apoyada en banco, barra sobre las caderas, eleva la cadera apretando glúteos.',
    recommendations: 'Lleva el movimiento completo hacia arriba. No arquear excesivamente.',
  },
  {
    name: 'Puente glúteo',
    primaryMuscle: PrimaryMuscle.glute,
    equipment: Equipment.bodyweight,
    instructions:
      'Acostado con rodillas flexionadas, eleva las caderas apretando los glúteos al final.',
    recommendations: 'Mantén los pies firmes. Aprieta los glúteos en la posición superior.',
  },
] as const;

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

const PLAN_1: PlanDef = {
  id: PLAN_1_ID,
  name: 'Principiante Full Body 3 días',
  goal: 'Ganancia de fuerza y condición general',
  level: 'beginner',
  durationWeeks: 4,
  generalNotes:
    'Plan diseñado para principiantes. Prioriza la técnica sobre el peso. Realiza calentamiento antes de cada sesión.',
  weeks: [
    {
      weekNumber: 1,
      days: [
        {
          dayOfWeek: DayOfWeek.monday,
          session: {
            name: 'Full Body A',
            description: 'Sesión enfocada en patrón de sentadilla, empuje horizontal y remo.',
            exercises: [
              {
                name: 'Sentadilla con barra',
                sets: 3,
                reps: '10',
                restSeconds: 90,
                alternatives: [{ name: 'Sentadilla búlgara', note: 'Sin peso adicional' }],
              },
              {
                name: 'Press de banca con barra',
                sets: 3,
                reps: '10',
                restSeconds: 90,
                alternatives: [{ name: 'Flexiones de brazos', note: 'Variante asistida si es necesario' }],
              },
              {
                name: 'Remo con barra',
                sets: 3,
                reps: '10',
                restSeconds: 60,
                alternatives: [{ name: 'Remo sentado en máquina', note: 'Mejor control del movimiento' }],
              },
              {
                name: 'Puente glúteo',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Plancha',
                sets: 3,
                reps: '30s',
                restSeconds: 60,
              },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.wednesday,
          session: {
            name: 'Full Body B',
            description: 'Sesión enfocada en variante unilateral, empuje inclinado y jalón.',
            exercises: [
              {
                name: 'Sentadilla búlgara',
                sets: 3,
                reps: '10',
                restSeconds: 90,
              },
              {
                name: 'Press inclinado con mancuernas',
                sets: 3,
                reps: '10',
                restSeconds: 90,
              },
              {
                name: 'Jalón al pecho',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Zancadas caminando',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Plancha',
                sets: 3,
                reps: '30s',
                restSeconds: 60,
              },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.friday,
          session: {
            name: 'Full Body C',
            description: 'Sesión enfocada en bisagra de cadera, empuje con peso corporal y core.',
            exercises: [
              {
                name: 'Peso muerto rumano',
                sets: 3,
                reps: '10',
                restSeconds: 90,
              },
              {
                name: 'Flexiones de brazos',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Remo sentado en máquina',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Puente glúteo',
                sets: 3,
                reps: '15',
                restSeconds: 60,
              },
              {
                name: 'Crunch en polea',
                sets: 3,
                reps: '15',
                restSeconds: 60,
              },
            ],
          },
        },
      ],
    },
    {
      weekNumber: 2,
      days: [
        {
          dayOfWeek: DayOfWeek.monday,
          session: {
            name: 'Full Body A',
            description: 'Semana 2: añade 1 set o aumenta ligeramente el peso.',
            exercises: [
              { name: 'Sentadilla con barra', sets: 3, reps: '10', restSeconds: 90 },
              { name: 'Press de banca con barra', sets: 3, reps: '10', restSeconds: 90 },
              { name: 'Remo con barra', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Puente glúteo', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Plancha', sets: 3, reps: '35s', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.wednesday,
          session: {
            name: 'Full Body B',
            description: 'Semana 2: añade 1 set o aumenta ligeramente el peso.',
            exercises: [
              { name: 'Sentadilla búlgara', sets: 3, reps: '10', restSeconds: 90 },
              { name: 'Press inclinado con mancuernas', sets: 3, reps: '10', restSeconds: 90 },
              { name: 'Jalón al pecho', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Zancadas caminando', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Plancha', sets: 3, reps: '35s', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.friday,
          session: {
            name: 'Full Body C',
            description: 'Semana 2: añade 1 set o aumenta ligeramente el peso.',
            exercises: [
              { name: 'Peso muerto rumano', sets: 3, reps: '10', restSeconds: 90 },
              { name: 'Flexiones de brazos', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Remo sentado en máquina', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Puente glúteo', sets: 3, reps: '15', restSeconds: 60 },
              { name: 'Crunch en polea', sets: 3, reps: '15', restSeconds: 60 },
            ],
          },
        },
      ],
    },
    {
      weekNumber: 3,
      days: [
        {
          dayOfWeek: DayOfWeek.monday,
          session: {
            name: 'Full Body A',
            description: 'Semana 3: aumenta progresión de sets o peso.',
            exercises: [
              { name: 'Sentadilla con barra', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Press de banca con barra', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Remo con barra', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Puente glúteo', sets: 3, reps: '15', restSeconds: 60 },
              { name: 'Plancha', sets: 3, reps: '40s', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.wednesday,
          session: {
            name: 'Full Body B',
            description: 'Semana 3: aumenta progresión de sets o peso.',
            exercises: [
              { name: 'Sentadilla búlgara', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Press inclinado con mancuernas', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Jalón al pecho', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Zancadas caminando', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Plancha', sets: 3, reps: '40s', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.friday,
          session: {
            name: 'Full Body C',
            description: 'Semana 3: aumenta progresión de sets o peso.',
            exercises: [
              { name: 'Peso muerto rumano', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Flexiones de brazos', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Remo sentado en máquina', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Puente glúteo', sets: 3, reps: '15', restSeconds: 60 },
              { name: 'Crunch en polea', sets: 3, reps: '15', restSeconds: 60 },
            ],
          },
        },
      ],
    },
    {
      weekNumber: 4,
      days: [
        {
          dayOfWeek: DayOfWeek.monday,
          session: {
            name: 'Full Body A',
            description: 'Semana 4: volumen máximo del ciclo.',
            exercises: [
              { name: 'Sentadilla con barra', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Press de banca con barra', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Remo con barra', sets: 4, reps: '8', restSeconds: 60 },
              { name: 'Puente glúteo', sets: 3, reps: '15', restSeconds: 60 },
              { name: 'Plancha', sets: 3, reps: '45s', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.wednesday,
          session: {
            name: 'Full Body B',
            description: 'Semana 4: volumen máximo del ciclo.',
            exercises: [
              { name: 'Sentadilla búlgara', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Press inclinado con mancuernas', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Jalón al pecho', sets: 4, reps: '10', restSeconds: 60 },
              { name: 'Zancadas caminando', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Plancha', sets: 3, reps: '45s', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.friday,
          session: {
            name: 'Full Body C',
            description: 'Semana 4: volumen máximo del ciclo.',
            exercises: [
              { name: 'Peso muerto rumano', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Flexiones de brazos', sets: 4, reps: '10', restSeconds: 60 },
              { name: 'Remo sentado en máquina', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Puente glúteo', sets: 3, reps: '15', restSeconds: 60 },
              { name: 'Crunch en polea', sets: 3, reps: '15', restSeconds: 60 },
            ],
          },
        },
      ],
    },
  ],
};

const PLAN_2: PlanDef = {
  id: PLAN_2_ID,
  name: 'Intermedio Push/Pull/Legs',
  goal: 'Hipertrofia y fuerza con división por grupos musculares',
  level: 'intermediate',
  durationWeeks: 4,
  generalNotes:
    'Plan de 4 días para nivel intermedio. Descanso activo miércoles y fin de semana. Aumenta peso progresivamente.',
  weeks: [
    {
      weekNumber: 1,
      days: [
        {
          dayOfWeek: DayOfWeek.monday,
          session: {
            name: 'Push',
            description: 'Pecho, hombros y tríceps.',
            exercises: [
              {
                name: 'Press de banca con barra',
                sets: 4,
                reps: '8',
                restSeconds: 90,
                alternatives: [{ name: 'Flexiones de brazos', note: 'Variante con peso si es posible' }],
              },
              {
                name: 'Press inclinado con mancuernas',
                sets: 3,
                reps: '10',
                restSeconds: 90,
              },
              {
                name: 'Press militar con barra',
                sets: 3,
                reps: '10',
                restSeconds: 60,
              },
              {
                name: 'Elevaciones laterales',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Extensión de tríceps en polea',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Fondos en paralelas',
                sets: 3,
                reps: '10',
                restSeconds: 60,
              },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.tuesday,
          session: {
            name: 'Pull',
            description: 'Espalda, bíceps y rear deltoides.',
            exercises: [
              {
                name: 'Dominadas',
                sets: 4,
                reps: '8',
                restSeconds: 90,
                alternatives: [{ name: 'Jalón al pecho', note: 'Asistido o con peso corporal' }],
              },
              {
                name: 'Remo con barra',
                sets: 4,
                reps: '8',
                restSeconds: 90,
              },
              {
                name: 'Jalón al pecho',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Curl con barra',
                sets: 3,
                reps: '10',
                restSeconds: 60,
              },
              {
                name: 'Curl martillo',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Face pulls',
                sets: 3,
                reps: '15',
                restSeconds: 60,
              },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.thursday,
          session: {
            name: 'Legs',
            description: 'Piernas y glúteos con énfasis en sentadilla y bisagra.',
            exercises: [
              {
                name: 'Sentadilla con barra',
                sets: 4,
                reps: '8',
                restSeconds: 120,
                alternatives: [{ name: 'Sentadilla búlgara', note: 'Con mancuernas' }],
              },
              {
                name: 'Peso muerto rumano',
                sets: 4,
                reps: '8',
                restSeconds: 120,
                alternatives: [{ name: 'Hip thrust con barra', note: 'Mayor enfoque en glúteos' }],
              },
              {
                name: 'Sentadilla búlgara',
                sets: 3,
                reps: '10',
                restSeconds: 90,
              },
              {
                name: 'Zancadas caminando',
                sets: 3,
                reps: '12',
                restSeconds: 90,
              },
              {
                name: 'Hip thrust con barra',
                sets: 3,
                reps: '12',
                restSeconds: 90,
              },
              {
                name: 'Puente glúteo',
                sets: 3,
                reps: '15',
                restSeconds: 60,
              },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.friday,
          session: {
            name: 'Upper / Accesorios',
            description: 'Mix de tren superior con énfasis en acabados y core.',
            exercises: [
              {
                name: 'Aperturas en máquina peck deck',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Remo sentado en máquina',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Elevaciones laterales',
                sets: 3,
                reps: '15',
                restSeconds: 60,
              },
              {
                name: 'Curl martillo',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Extensión de tríceps en polea',
                sets: 3,
                reps: '12',
                restSeconds: 60,
              },
              {
                name: 'Plancha',
                sets: 3,
                reps: '45s',
                restSeconds: 60,
              },
            ],
          },
        },
      ],
    },
    {
      weekNumber: 2,
      days: [
        {
          dayOfWeek: DayOfWeek.monday,
          session: {
            name: 'Push',
            description: 'Semana 2: añade peso o 1 set en compuestos.',
            exercises: [
              { name: 'Press de banca con barra', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Press inclinado con mancuernas', sets: 3, reps: '10', restSeconds: 90 },
              { name: 'Press militar con barra', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Elevaciones laterales', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Extensión de tríceps en polea', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Fondos en paralelas', sets: 3, reps: '10', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.tuesday,
          session: {
            name: 'Pull',
            description: 'Semana 2: añade peso o 1 set en compuestos.',
            exercises: [
              { name: 'Dominadas', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Remo con barra', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Jalón al pecho', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Curl con barra', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Curl martillo', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Face pulls', sets: 3, reps: '15', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.thursday,
          session: {
            name: 'Legs',
            description: 'Semana 2: añade peso o 1 set en compuestos.',
            exercises: [
              { name: 'Sentadilla con barra', sets: 4, reps: '8', restSeconds: 120 },
              { name: 'Peso muerto rumano', sets: 4, reps: '8', restSeconds: 120 },
              { name: 'Sentadilla búlgara', sets: 3, reps: '10', restSeconds: 90 },
              { name: 'Zancadas caminando', sets: 3, reps: '12', restSeconds: 90 },
              { name: 'Hip thrust con barra', sets: 3, reps: '12', restSeconds: 90 },
              { name: 'Puente glúteo', sets: 3, reps: '15', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.friday,
          session: {
            name: 'Upper / Accesorios',
            description: 'Semana 2: añade peso en aislamientos.',
            exercises: [
              { name: 'Aperturas en máquina peck deck', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Remo sentado en máquina', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Elevaciones laterales', sets: 3, reps: '15', restSeconds: 60 },
              { name: 'Curl martillo', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Extensión de tríceps en polea', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Plancha', sets: 3, reps: '45s', restSeconds: 60 },
            ],
          },
        },
      ],
    },
    {
      weekNumber: 3,
      days: [
        {
          dayOfWeek: DayOfWeek.monday,
          session: {
            name: 'Push',
            description: 'Semana 3: aumenta intensidad en compuestos.',
            exercises: [
              { name: 'Press de banca con barra', sets: 4, reps: '6', restSeconds: 120 },
              { name: 'Press inclinado con mancuernas', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Press militar con barra', sets: 3, reps: '8', restSeconds: 90 },
              { name: 'Elevaciones laterales', sets: 4, reps: '12', restSeconds: 60 },
              { name: 'Extensión de tríceps en polea', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Fondos en paralelas', sets: 3, reps: '8', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.tuesday,
          session: {
            name: 'Pull',
            description: 'Semana 3: aumenta intensidad en compuestos.',
            exercises: [
              { name: 'Dominadas', sets: 4, reps: '6', restSeconds: 120 },
              { name: 'Remo con barra', sets: 4, reps: '6', restSeconds: 120 },
              { name: 'Jalón al pecho', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Curl con barra', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Curl martillo', sets: 3, reps: '12', restSeconds: 60 },
              { name: 'Face pulls', sets: 3, reps: '15', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.thursday,
          session: {
            name: 'Legs',
            description: 'Semana 3: aumenta intensidad en compuestos.',
            exercises: [
              { name: 'Sentadilla con barra', sets: 4, reps: '6', restSeconds: 150 },
              { name: 'Peso muerto rumano', sets: 4, reps: '6', restSeconds: 150 },
              { name: 'Sentadilla búlgara', sets: 3, reps: '8', restSeconds: 90 },
              { name: 'Zancadas caminando', sets: 3, reps: '10', restSeconds: 90 },
              { name: 'Hip thrust con barra', sets: 3, reps: '10', restSeconds: 90 },
              { name: 'Puente glúteo', sets: 3, reps: '15', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.friday,
          session: {
            name: 'Upper / Accesorios',
            description: 'Semana 3: aumenta intensidad en aislamientos.',
            exercises: [
              { name: 'Aperturas en máquina peck deck', sets: 4, reps: '10', restSeconds: 60 },
              { name: 'Remo sentado en máquina', sets: 4, reps: '10', restSeconds: 60 },
              { name: 'Elevaciones laterales', sets: 4, reps: '12', restSeconds: 60 },
              { name: 'Curl martillo', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Extensión de tríceps en polea', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Plancha', sets: 3, reps: '50s', restSeconds: 60 },
            ],
          },
        },
      ],
    },
    {
      weekNumber: 4,
      days: [
        {
          dayOfWeek: DayOfWeek.monday,
          session: {
            name: 'Push',
            description: 'Semana 4: pico de intensidad del ciclo.',
            exercises: [
              { name: 'Press de banca con barra', sets: 5, reps: '5', restSeconds: 150 },
              { name: 'Press inclinado con mancuernas', sets: 4, reps: '8', restSeconds: 90 },
              { name: 'Press militar con barra', sets: 3, reps: '8', restSeconds: 90 },
              { name: 'Elevaciones laterales', sets: 4, reps: '12', restSeconds: 60 },
              { name: 'Extensión de tríceps en polea', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Fondos en paralelas', sets: 3, reps: '8', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.tuesday,
          session: {
            name: 'Pull',
            description: 'Semana 4: pico de intensidad del ciclo.',
            exercises: [
              { name: 'Dominadas', sets: 5, reps: '5', restSeconds: 150 },
              { name: 'Remo con barra', sets: 5, reps: '5', restSeconds: 150 },
              { name: 'Jalón al pecho', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Curl con barra', sets: 3, reps: '8', restSeconds: 60 },
              { name: 'Curl martillo', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Face pulls', sets: 3, reps: '15', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.thursday,
          session: {
            name: 'Legs',
            description: 'Semana 4: pico de intensidad del ciclo.',
            exercises: [
              { name: 'Sentadilla con barra', sets: 5, reps: '5', restSeconds: 180 },
              { name: 'Peso muerto rumano', sets: 5, reps: '5', restSeconds: 180 },
              { name: 'Sentadilla búlgara', sets: 3, reps: '8', restSeconds: 90 },
              { name: 'Zancadas caminando', sets: 3, reps: '10', restSeconds: 90 },
              { name: 'Hip thrust con barra', sets: 3, reps: '10', restSeconds: 90 },
              { name: 'Puente glúteo', sets: 3, reps: '15', restSeconds: 60 },
            ],
          },
        },
        {
          dayOfWeek: DayOfWeek.friday,
          session: {
            name: 'Upper / Accesorios',
            description: 'Semana 4: pico de intensidad del ciclo.',
            exercises: [
              { name: 'Aperturas en máquina peck deck', sets: 4, reps: '10', restSeconds: 60 },
              { name: 'Remo sentado en máquina', sets: 4, reps: '10', restSeconds: 60 },
              { name: 'Elevaciones laterales', sets: 4, reps: '12', restSeconds: 60 },
              { name: 'Curl martillo', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Extensión de tríceps en polea', sets: 3, reps: '10', restSeconds: 60 },
              { name: 'Plancha', sets: 3, reps: '60s', restSeconds: 60 },
            ],
          },
        },
      ],
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function findExerciseByName(
  // biome-ignore lint/suspicious/noExplicitAny: Prisma client in seed script
  prisma: any,
  name: string,
) {
  const exercise = await prisma.exercise.findFirst({
    where: { name, organizationId: null },
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
        const exercise = await findExerciseByName(prisma, exDef.name);

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
            const altExercise = await findExerciseByName(prisma, altDef.name);
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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const prisma = createPrismaClient();

  // ── Seed global exercises ────────────────────────────────────────────────
  let createdCount = 0;
  let updatedCount = 0;

  for (const exercise of EXERCISES) {
    const existing = await prisma.exercise.findFirst({
      where: { name: exercise.name, organizationId: null },
    });

    const data = {
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      secondaryMuscles: [] as string[],
      equipment: exercise.equipment,
      instructions: exercise.instructions,
      recommendations: exercise.recommendations,
      mediaUrl: null,
      mediaType: null,
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

  console.log(`Exercises seed: ${createdCount} created, ${updatedCount} updated`);

  // ── Seed system user ─────────────────────────────────────────────────────
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

  // ── Seed organization ──────────────────────────────────────────────────
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

  // ── Seed system member ───────────────────────────────────────────────────
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

  // ── Register seed org in SystemSetting ───────────────────────────────────
  await prisma.systemSetting.upsert({
    where: { key: 'system.seedOrganizationId' },
    update: { value: SEED_ORG_ID },
    create: {
      key: 'system.seedOrganizationId',
      value: SEED_ORG_ID,
    },
  });

  // ── Seed training plans ──────────────────────────────────────────────────
  await seedTrainingPlan(prisma, PLAN_1, SYSTEM_MEMBER_ID, SEED_ORG_ID);
  await seedTrainingPlan(prisma, PLAN_2, SYSTEM_MEMBER_ID, SEED_ORG_ID);

  console.log('Training plans seed: 2 base templates ensured');

  await prisma.$disconnect();
}

void main();
