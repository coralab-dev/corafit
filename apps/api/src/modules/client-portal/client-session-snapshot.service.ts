import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

type SnapshotExercise = {
  id: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  instructions: string | null;
  recommendations: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
};

type SnapshotSessionExerciseSource = {
  id: string;
  exerciseId: string;
  orderIndex: number;
  sets: number | null;
  reps: string;
  restSeconds: number | null;
  coachNote: string | null;
  exercise: SnapshotExercise;
  alternatives: Array<{
    id: string;
    alternativeExerciseId: string;
    note: string | null;
    alternativeExercise: SnapshotExercise;
  }>;
};

type SnapshotSessionSource = {
  id: string;
  name: string;
  description: string | null;
  coachNote: string | null;
  exercises: SnapshotSessionExerciseSource[];
};

export type ClientSessionSnapshotV1 = {
  version: 1;
  capturedAt: string;
  session: {
    id: string;
    name: string;
    description: string | null;
    coachNote: string | null;
  };
  exercises: Array<{
    sessionExerciseId: string;
    exerciseId: string;
    orderIndex: number;
    sets: number | null;
    reps: string;
    restSeconds: number | null;
    coachNote: string | null;
    exercise: {
      id: string;
      name: string;
      primaryMuscle: string;
      secondaryMuscles: string[];
      equipment: string;
      instructions: string | null;
      recommendations: string | null;
      mediaUrl: string | null;
      mediaType: string | null;
    };
    alternatives: Array<{
      id: string;
      alternativeExerciseId: string;
      note: string | null;
      exercise: {
        id: string;
        name: string;
        primaryMuscle: string;
        secondaryMuscles: string[];
        equipment: string;
        instructions: string | null;
        recommendations: string | null;
        mediaUrl: string | null;
        mediaType: string | null;
      };
    }>;
  }>;
  progress?: ClientSessionSnapshotProgress;
};

export type ClientSessionSnapshotProgress = {
  completedExerciseIds: string[];
  usedAlternatives: Array<{
    sessionExerciseId: string;
    alternativeId: string;
    alternativeExerciseId: string;
  }>;
};

@Injectable()
export class ClientSessionSnapshotService {
  constructor(private readonly prismaService: PrismaService) {}

  async buildSnapshotForSession(trainingSessionId: string): Promise<ClientSessionSnapshotV1> {
    const session = await this.prismaService.trainingSession.findFirst({
      where: { id: trainingSessionId },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: {
            exercise: true,
            alternatives: {
              orderBy: { id: 'asc' },
              include: { alternativeExercise: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Training session was not found');
    }

    return this.buildSnapshot(session);
  }

  parseSnapshotData(value: unknown): ClientSessionSnapshotV1 {
    if (!this.isSnapshotV1(value)) {
      throw new BadRequestException('Invalid client session snapshot');
    }

    return value;
  }

  isSnapshotV1(value: unknown): value is ClientSessionSnapshotV1 {
    if (!this.isRecord(value) || value.version !== 1) {
      return false;
    }

    return (
      this.isString(value.capturedAt) &&
      this.isSessionSnapshot(value.session) &&
      Array.isArray(value.exercises) &&
      value.exercises.every((exercise) => this.isSessionExerciseSnapshot(exercise)) &&
      (value.progress === undefined || this.isProgressSnapshot(value.progress))
    );
  }

  private buildSnapshot(session: SnapshotSessionSource): ClientSessionSnapshotV1 {
    return {
      version: 1,
      capturedAt: this.getCurrentDate().toISOString(),
      session: {
        id: session.id,
        name: session.name,
        description: session.description,
        coachNote: session.coachNote,
      },
      exercises: [...session.exercises]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((sessionExercise) => ({
          sessionExerciseId: sessionExercise.id,
          exerciseId: sessionExercise.exerciseId,
          orderIndex: sessionExercise.orderIndex,
          sets: sessionExercise.sets,
          reps: sessionExercise.reps,
          restSeconds: sessionExercise.restSeconds,
          coachNote: sessionExercise.coachNote,
          exercise: this.copyExercise(sessionExercise.exercise),
          alternatives: [...sessionExercise.alternatives]
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((alternative) => ({
              id: alternative.id,
              alternativeExerciseId: alternative.alternativeExerciseId,
              note: alternative.note,
              exercise: this.copyExercise(alternative.alternativeExercise),
            })),
        })),
    };
  }

  private copyExercise(exercise: SnapshotExercise) {
    return {
      id: exercise.id,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle.toString(),
      secondaryMuscles: exercise.secondaryMuscles.map((muscle) => muscle.toString()),
      equipment: exercise.equipment.toString(),
      instructions: exercise.instructions,
      recommendations: exercise.recommendations,
      mediaUrl: exercise.mediaUrl,
      mediaType: exercise.mediaType?.toString() ?? null,
    };
  }

  private getCurrentDate() {
    return new Date();
  }

  private isSessionSnapshot(value: unknown) {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isString(value.id) &&
      this.isString(value.name) &&
      this.isNullableString(value.description) &&
      this.isNullableString(value.coachNote)
    );
  }

  private isSessionExerciseSnapshot(value: unknown) {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isString(value.sessionExerciseId) &&
      this.isString(value.exerciseId) &&
      this.isNumber(value.orderIndex) &&
      this.isNullableNumber(value.sets) &&
      this.isString(value.reps) &&
      this.isNullableNumber(value.restSeconds) &&
      this.isNullableString(value.coachNote) &&
      this.isExerciseSnapshot(value.exercise) &&
      Array.isArray(value.alternatives) &&
      value.alternatives.every((alternative) => this.isAlternativeSnapshot(alternative))
    );
  }

  private isAlternativeSnapshot(value: unknown) {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isString(value.id) &&
      this.isString(value.alternativeExerciseId) &&
      this.isNullableString(value.note) &&
      this.isExerciseSnapshot(value.exercise)
    );
  }

  private isProgressSnapshot(value: unknown) {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      Array.isArray(value.completedExerciseIds) &&
      value.completedExerciseIds.every((exerciseId) => this.isString(exerciseId)) &&
      Array.isArray(value.usedAlternatives) &&
      value.usedAlternatives.every((alternative) => this.isUsedAlternativeSnapshot(alternative))
    );
  }

  private isUsedAlternativeSnapshot(value: unknown) {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isString(value.sessionExerciseId) &&
      this.isString(value.alternativeId) &&
      this.isString(value.alternativeExerciseId)
    );
  }

  private isExerciseSnapshot(value: unknown) {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isString(value.id) &&
      this.isString(value.name) &&
      this.isString(value.primaryMuscle) &&
      Array.isArray(value.secondaryMuscles) &&
      value.secondaryMuscles.every((muscle) => this.isString(muscle)) &&
      this.isString(value.equipment) &&
      this.isNullableString(value.instructions) &&
      this.isNullableString(value.recommendations) &&
      this.isNullableString(value.mediaUrl) &&
      this.isNullableString(value.mediaType)
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  private isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private isNullableString(value: unknown): value is string | null {
    return value === null || this.isString(value);
  }

  private isNullableNumber(value: unknown): value is number | null {
    return value === null || this.isNumber(value);
  }
}
