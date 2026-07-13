import type {
  Client,
  CurrentPlanAssignment,
  DayOfWeek,
  SessionExercise,
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanWeek,
} from "../../lib/clients/types";

const levelLabels: Record<string, string> = {
  advanced: "Avanzado",
  beginner: "Principiante",
  intermediate: "Intermedio",
};

const daySequence: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const shortDayLabels: Record<DayOfWeek, string> = {
  friday: "Vie",
  monday: "Lun",
  saturday: "Sáb",
  sunday: "Dom",
  thursday: "Jue",
  tuesday: "Mar",
  wednesday: "Mié",
};

const monthLabels = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export type AssignmentWorkspaceState = {
  plans: TrainingPlan[];
  selectedPlanSummary: TrainingPlan | null;
  selectedPlanDetail: TrainingPlan | null;
  selectedWeekNumber: number | null;
  selectedDayKey: string | null;
  startDate: string;
  planDetailRequestId: number | null;
};

export type PlanListFacts = {
  badge: "Mi plan" | "Plan base";
  duration: string;
  goal: string;
  level: string;
  name: string;
};

export type WeekPreviewDayExercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: string;
  restSeconds: number | null;
  coachNote: string | null;
  hasAlternatives: boolean;
};

export type WeekPreviewDay = {
  key: string;
  date: string | null;
  dayNumber: string;
  dayOfWeek: DayOfWeek;
  shortLabel: string;
  isRest: boolean;
  session: TrainingPlanDay["session"];
  exerciseCount: number;
  exercises: WeekPreviewDayExercise[];
};

export type WeekPreview = {
  weekNumber: number;
  rangeLabel: string;
  days: WeekPreviewDay[];
};

export function createAssignmentInitialState({
  initialStartDate,
  plans = [],
}: {
  initialStartDate: string;
  plans?: TrainingPlan[];
}): AssignmentWorkspaceState {
  return {
    plans,
    selectedPlanSummary: null,
    selectedPlanDetail: null,
    selectedWeekNumber: null,
    selectedDayKey: null,
    startDate: initialStartDate,
    planDetailRequestId: null,
  };
}

export function selectPlanSummary(
  state: AssignmentWorkspaceState,
  plan: TrainingPlan,
  requestId: number,
): AssignmentWorkspaceState {
  return {
    ...state,
    selectedPlanSummary: plan,
    selectedPlanDetail: null,
    selectedWeekNumber: null,
    selectedDayKey: null,
    planDetailRequestId: requestId,
  };
}

export function resolvePlanDetailSuccess(
  state: AssignmentWorkspaceState,
  {
    detail,
    requestId,
  }: {
    detail: TrainingPlan;
    requestId: number;
  },
): AssignmentWorkspaceState {
  if (
    state.planDetailRequestId !== requestId ||
    state.selectedPlanSummary?.id !== detail.id
  ) {
    return state;
  }

  const firstWeek = getSortedWeeks(detail)[0] ?? null;
  const preview = firstWeek
    ? getWeekPreview(detail, firstWeek.weekNumber, state.startDate)
    : null;
  const selectedDayKey =
    preview?.days.find((day) => !day.isRest)?.key ?? preview?.days[0]?.key ?? null;

  return {
    ...state,
    selectedPlanDetail: detail,
    selectedWeekNumber: firstWeek?.weekNumber ?? null,
    selectedDayKey,
    planDetailRequestId: null,
  };
}

export function getPlanListFacts(plan: TrainingPlan): PlanListFacts {
  return {
    badge: plan.isSystemTemplate ? "Plan base" : "Mi plan",
    duration: `${plan.durationWeeks} semanas`,
    goal: plan.goal ?? "Sin objetivo",
    level: getLevelLabel(plan.level),
    name: plan.name,
  };
}

export function getLevelLabel(level: string | null | undefined) {
  return level ? levelLabels[level] ?? level : "Sin nivel";
}

export function getWeekPreview(
  plan: TrainingPlan,
  weekNumber: number,
  startDate: string,
): WeekPreview | null {
  const week = getSortedWeeks(plan).find((item) => item.weekNumber === weekNumber);
  if (!week) {
    return null;
  }

  const weekIndex = Math.max(0, week.weekNumber - 1);
  const weekStart = startDate ? addDays(parseDateOnly(startDate), weekIndex * 7) : null;
  const daysByWeekday = new Map((week.days ?? []).map((day) => [day.dayOfWeek, day]));

  const days = Array.from({ length: 7 }, (_, dayOffset) => {
    const date = weekStart ? addDays(weekStart, dayOffset) : null;
    const dayOfWeek = date ? daySequence[date.getDay()] : rotateDaySequence()[dayOffset];
    const planDay = daysByWeekday.get(dayOfWeek);

    return createPreviewDay({
      date,
      dayOfWeek,
      dayOffset,
      planDay,
    });
  });

  return {
    weekNumber: week.weekNumber,
    rangeLabel: getWeekRangeLabel(days),
    days,
  };
}

export function getAssignmentEndDate(
  plan: TrainingPlan | null,
  startDate: string,
): string | null {
  if (!plan || !startDate) {
    return null;
  }

  return formatDateOnly(addDays(parseDateOnly(startDate), plan.durationWeeks * 7 - 1));
}

export function formatDateOnlyEs(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return undefined;
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function getFirstWeekRange(
  plan: TrainingPlan | null,
  startDate: string,
): string | null {
  if (!plan || !startDate) {
    return null;
  }

  return getWeekPreview(plan, getSortedWeeks(plan)[0]?.weekNumber ?? 1, startDate)
    ?.rangeLabel ?? null;
}

export function getWeekSessionCount(plan: TrainingPlan | null, weekNumber: number | null) {
  if (!plan || weekNumber === null) {
    return 0;
  }

  const week = getSortedWeeks(plan).find((item) => item.weekNumber === weekNumber);
  return (week?.days ?? []).filter((day) => day.session).length;
}

export function isClientAvailableForAssignment(client: Client): boolean {
  return !hasActiveAssignment(client.currentAssignment);
}

export function canConfirmAssignment({
  client,
  selectedPlanId,
  startDate,
  isPlanDetailLoading,
  previewError,
  isAssigning,
}: {
  client: Client | null;
  selectedPlanId: string;
  startDate: string;
  isPlanDetailLoading: boolean;
  previewError: string;
  isAssigning: boolean;
}): boolean {
  return Boolean(
    client &&
      isClientAvailableForAssignment(client) &&
      selectedPlanId &&
      startDate &&
      !isPlanDetailLoading &&
      !previewError &&
      !isAssigning,
  );
}

export function hasActiveAssignment(assignment: CurrentPlanAssignment | null | undefined) {
  return assignment?.assignment?.status === "active";
}

export function getSortedWeeks(plan: TrainingPlan): TrainingPlanWeek[] {
  return [...(plan.weeks ?? [])].sort((first, second) => first.weekNumber - second.weekNumber);
}

function createPreviewDay({
  date,
  dayOfWeek,
  dayOffset,
  planDay,
}: {
  date: Date | null;
  dayOfWeek: DayOfWeek;
  dayOffset: number;
  planDay: TrainingPlanDay | undefined;
}): WeekPreviewDay {
  const session = planDay?.session ?? null;
  const exercises = getSessionExercises(session?.exercises ?? []);

  return {
    key: date ? formatDateOnly(date) : `${dayOfWeek}-${dayOffset}`,
    date: date ? formatDateOnly(date) : null,
    dayNumber: date ? String(date.getDate()).padStart(2, "0") : "",
    dayOfWeek,
    shortLabel: shortDayLabels[dayOfWeek],
    isRest: !session,
    session,
    exerciseCount: exercises.length,
    exercises,
  };
}

function getSessionExercises(exercises: SessionExercise[]): WeekPreviewDayExercise[] {
  return [...exercises]
    .sort((first, second) => first.orderIndex - second.orderIndex)
    .map((exercise) => ({
      id: exercise.id,
      name: exercise.exercise?.name ?? "Ejercicio sin nombre",
      sets: exercise.sets,
      reps: exercise.reps,
      restSeconds: exercise.restSeconds,
      coachNote: exercise.coachNote,
      hasAlternatives: Boolean(exercise.alternatives?.length),
    }));
}

function getWeekRangeLabel(days: WeekPreviewDay[]) {
  const firstDate = days[0]?.date ? parseDateOnly(days[0].date) : null;
  const lastDate = days[days.length - 1]?.date
    ? parseDateOnly(days[days.length - 1].date ?? "")
    : null;

  if (!firstDate || !lastDate) {
    return "";
  }

  const firstDay = firstDate.getDate();
  const lastDay = lastDate.getDate();
  const firstMonth = monthLabels[firstDate.getMonth()];
  const lastMonth = monthLabels[lastDate.getMonth()];

  if (firstDate.getMonth() === lastDate.getMonth()) {
    return `${firstDay}–${lastDay} de ${firstMonth}`;
  }

  return `${firstDay} de ${firstMonth}–${lastDay} de ${lastMonth}`;
}

function rotateDaySequence() {
  return [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as DayOfWeek[];
}

function parseDateOnly(value: string) {
  const [year = "0", month = "1", day = "1"] = value.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}
