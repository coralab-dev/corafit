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
