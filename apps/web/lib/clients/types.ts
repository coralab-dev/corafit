export type ClientType = "online" | "presential" | "hybrid";
export type OperationalStatus = "active" | "paused" | "inactive" | "archived";
export type AccessStatus = "none" | "active" | "disabled" | "temporarily_locked";

export type ClientAccess = {
  id?: string;
  lastAccessAt?: string | null;
  lockedUntil?: string | null;
  status: AccessStatus;
  link?: string;
  pin?: string;
  updatedAt?: string;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  age: number;
  sex: string;
  clientType: ClientType;
  mainGoal: string;
  heightCm: number;
  initialWeightKg: number;
  trainingLevel: string;
  injuriesNotes: string;
  generalNotes: string;
  canRegisterWeight: boolean;
  operationalStatus: OperationalStatus;
  access: ClientAccess;
};

export type ClientsResponse = {
  items: Array<Omit<Client, "access">>;
  limit: number;
  page: number;
  total: number;
};

export type ApiConfig = {
  apiUrl: string;
  bearerToken: string;
  organizationId: string;
};

export type TrainingPlanStatus = "draft" | "active" | "archived";
export type TrainingPlanType = "template" | "assigned_copy";
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type SessionExerciseAlternative = {
  id: string;
  note: string | null;
  alternativeExercise?: { id: string; name: string };
};

export type SessionExercise = {
  id: string;
  orderIndex: number;
  sets: number | null;
  reps: string;
  restSeconds: number | null;
  coachNote: string | null;
  exercise?: { id: string; name: string };
  alternatives?: SessionExerciseAlternative[];
};

export type TrainingSession = {
  id: string;
  name: string;
  description: string | null;
  coachNote: string | null;
  exercises?: SessionExercise[];
};

export type TrainingPlanDay = {
  id: string;
  dayOfWeek: DayOfWeek;
  dayOrder: number | null;
  dayType: "training" | "rest";
  session: TrainingSession | null;
};

export type TrainingPlanWeek = {
  id: string;
  weekNumber: number;
  notes: string | null;
  days?: TrainingPlanDay[];
};

export type TrainingPlan = {
  id: string;
  name: string;
  goal: string | null;
  level: string | null;
  durationWeeks: number;
  generalNotes: string | null;
  planType: TrainingPlanType;
  status: TrainingPlanStatus;
  isSystemTemplate?: boolean;
  weeks?: TrainingPlanWeek[];
};

export type PlansResponse = {
  items: TrainingPlan[];
  total: number;
};

export type CurrentPlanAssignment = {
  assignment: {
    id: string;
    assignedPlanId: string;
    sourceTrainingPlanId: string;
    startDate: string;
    endedAt: string | null;
    status: "active" | "finished" | "removed";
  };
  sourcePlan: { id: string; name: string } | null;
  assignedPlan: TrainingPlan | null;
};
