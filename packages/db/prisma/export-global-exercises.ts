import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { config } from 'dotenv';
import { ExerciseMediaType, ExerciseStatus } from '../src/generated/prisma/client';
import { createPrismaClient } from '../src/prisma-client';
import { validateCanonicalExercises } from './seed-canonical-exercises';

config({ path: resolve(process.cwd(), '../../.env') });
config();

const outputPath = resolve(process.cwd(), 'prisma/seeds/global-exercises.seed.json');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to export canonical global exercises');
  }

  const prisma = createPrismaClient();

  try {
    const exercises = await prisma.exercise.findMany({
      where: {
        organizationId: null,
        status: ExerciseStatus.active,
        mediaType: ExerciseMediaType.image,
        mediaUrl: { not: null },
      },
      orderBy: [{ primaryMuscle: 'asc' }, { name: 'asc' }],
      select: {
        name: true,
        primaryMuscle: true,
        secondaryMuscles: true,
        equipment: true,
        instructions: true,
        recommendations: true,
        mediaUrl: true,
        mediaType: true,
        videoUrl: true,
      },
    });
    const canonicalExercises = validateCanonicalExercises(
      exercises.filter((exercise) => exercise.mediaUrl?.trim()),
    );

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      `${JSON.stringify(canonicalExercises, null, 2)}\n`,
      'utf8',
    );

    console.log(`Exported ${canonicalExercises.length} canonical global exercises`);
    console.log(`Output: ${outputPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
