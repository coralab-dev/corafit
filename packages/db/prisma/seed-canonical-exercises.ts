import {
  Equipment,
  ExerciseMediaType,
  PrimaryMuscle,
  type Exercise,
} from '../src/generated/prisma/client';

export type CanonicalExerciseSeed = Pick<
  Exercise,
  | 'name'
  | 'primaryMuscle'
  | 'secondaryMuscles'
  | 'equipment'
  | 'instructions'
  | 'recommendations'
  | 'mediaUrl'
  | 'mediaType'
  | 'videoUrl'
>;

const primaryMuscleValues = new Set<string>(Object.values(PrimaryMuscle));
const equipmentValues = new Set<string>(Object.values(Equipment));

export function validateCanonicalExercises(input: unknown): CanonicalExerciseSeed[] {
  if (!Array.isArray(input)) {
    throw new Error('Canonical exercises seed must be an array');
  }

  if (!input.length) {
    throw new Error('Canonical exercises seed must include at least one exercise');
  }

  return input.map((item, index) => validateCanonicalExercise(item, index));
}

export function validateTemplateExerciseNames(
  exerciseNames: string[],
  canonicalExercises: CanonicalExerciseSeed[],
) {
  const canonicalNames = new Set(canonicalExercises.map((exercise) => exercise.name));
  const missingNames = exerciseNames.filter((name) => !canonicalNames.has(name));

  if (missingNames.length) {
    throw new Error(
      `Template references exercises missing from canonical seed: ${missingNames.join(', ')}`,
    );
  }
}

export function isCanonicalGlobalExerciseSeedRow(
  exercise: Pick<Exercise, 'mediaType' | 'mediaUrl' | 'name'>,
  canonicalExerciseNames: Set<string>,
) {
  return (
    canonicalExerciseNames.has(exercise.name) &&
    typeof exercise.mediaUrl === 'string' &&
    Boolean(exercise.mediaUrl.trim()) &&
    exercise.mediaType === ExerciseMediaType.image
  );
}

function validateCanonicalExercise(input: unknown, index: number): CanonicalExerciseSeed {
  if (!isRecord(input)) {
    throw new Error(`Canonical exercise at index ${index} must be an object`);
  }

  const name = readRequiredString(input, 'name', index);
  const primaryMuscle = readEnumValue(input, 'primaryMuscle', primaryMuscleValues, index);
  const equipment = readEnumValue(input, 'equipment', equipmentValues, index);
  const secondaryMuscles = readSecondaryMuscles(input, index);
  const mediaUrl = readRequiredString(input, 'mediaUrl', index);
  const mediaType = readRequiredString(input, 'mediaType', index);

  if (mediaType !== ExerciseMediaType.image) {
    throw new Error(`Canonical exercise "${name}" must use mediaType=image`);
  }

  return {
    name,
    primaryMuscle: primaryMuscle as PrimaryMuscle,
    secondaryMuscles,
    equipment: equipment as Equipment,
    instructions: readNullableString(input, 'instructions', index),
    recommendations: readNullableString(input, 'recommendations', index),
    mediaUrl,
    mediaType: ExerciseMediaType.image,
    videoUrl: readNullableString(input, 'videoUrl', index),
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function readRequiredString(
  input: Record<string, unknown>,
  key: string,
  index: number,
) {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Canonical exercise at index ${index} must include non-empty ${key}`);
  }

  return value.trim();
}

function readNullableString(
  input: Record<string, unknown>,
  key: string,
  index: number,
) {
  const value = input[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`Canonical exercise at index ${index} has invalid ${key}`);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readEnumValue(
  input: Record<string, unknown>,
  key: string,
  allowedValues: Set<string>,
  index: number,
) {
  const value = readRequiredString(input, key, index);
  if (!allowedValues.has(value)) {
    throw new Error(`Canonical exercise at index ${index} has invalid ${key}`);
  }

  return value;
}

function readSecondaryMuscles(input: Record<string, unknown>, index: number) {
  const value: unknown = input.secondaryMuscles;
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`Canonical exercise at index ${index} has invalid secondaryMuscles`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}
