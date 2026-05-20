import type { ClientOperationalStatus, ClientType } from 'db';

export type CreateClientDto = {
  age?: number;
  canRegisterWeight?: boolean;
  clientType: ClientType;
  generalNotes?: string;
  heightCm: number;
  initialWeightKg: number;
  injuriesNotes?: string;
  mainGoal: string;
  name: string;
  phone?: string;
  sex?: string;
  trainingLevel?: string;
};

export type ListClientsQuery = {
  limit?: string;
  page?: string;
  search?: string;
  status?: ClientOperationalStatus;
};

export type UpdateClientDto = Partial<CreateClientDto>;

export type UpdateClientStatusDto = {
  status: ClientOperationalStatus;
};

export type AssignPlanDto = {
  trainingPlanId: string;
  startDate?: string;
};

export type UpdateCurrentPlanAssignmentDto = {
  name?: string;
  goal?: string | null;
  level?: string | null;
  durationWeeks?: number;
  generalNotes?: string | null;
  sessions?: Array<{
    sessionId: string;
    name?: string;
    description?: string | null;
    coachNote?: string | null;
  }>;
  exercises?: Array<{
    sessionExerciseId: string;
    exerciseId?: string;
    orderIndex?: number;
    sets?: number | null;
    reps?: string;
    restSeconds?: number | null;
    coachNote?: string | null;
  }>;
};
