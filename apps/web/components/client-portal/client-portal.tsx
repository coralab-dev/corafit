"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Dumbbell,
  FileText,
  Flame,
  Home,
  Info,
  Layers,
  ListChecks,
  Loader2,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  RotateCcw,
  Scale,
  Share2,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  TrendingUp,
  Moon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAppTheme } from "@/components/providers/theme-provider";
import { ClientPortalShell } from "@/components/client-portal/client-portal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createLatestCalendarRequestCoordinator,
  createLatestRequestCoordinator,
  getActivePendingWeekNavigation,
  getCalendarProgress,
  getCalendarWeekNavigationState,
  getUpcomingCalendarDays,
  getWeekNavigationTarget,
  isDateInsideCalendarDays,
  selectCalendarDay,
  selectMobileCalendarDay,
  type CalendarProgress,
  type CoordinatedRequest,
  type PendingWeekNavigation,
  type WeekNavigationDirection,
} from "@/components/client-portal/client-calendar-state";
import {
  buildWeightSummary,
  canClientManageWeightLog,
  deleteWeightLogById,
  formatWeightRecordedDate,
  getLocalWeightDateInputValue,
  upsertWeightLog,
} from "@/components/client-portal/client-progress-weight-state";
import {
  clientPortalRequest,
  clientPortalFormDataRequest,
  verifyPin,
  type ClientPortalBodyMeasurement,
  type ClientPortalCalendar,
  type ClientPortalDay,
  type ClientPortalProgressNote,
  type ClientPortalProgressPhoto,
  type ClientPortalProgressPhotoType,
  type ClientPortalStatus,
  type ClientPortalWeightLog,
  type ClientSessionLog,
  type ClientSessionPreview,
  type CompletionCard,
} from "@/lib/client-portal/api";
export { ClientHomeScreen } from "@/components/client-portal/client-home-screen";
export { ClientPortalShell } from "@/components/client-portal/client-portal-shell";

const statusLabels: Record<ClientPortalStatus, string> = {
  no_session: "Descanso",
  pending: "Pendiente",
  overdue: "Atrasada",
  opened: "Abierta",
  in_progress: "En progreso",
  completed: "Completada",
  partially_completed: "Parcial",
};

const shortDayLabels: Record<string, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mie",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sab",
  sunday: "Dom",
};

type CalendarDayTone =
  | "rest"
  | "pending"
  | "overdue"
  | "active"
  | "completed"
  | "partially_completed";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

const calendarCellToneClasses: Record<CalendarDayTone, string> = {
  rest: "border-[#e6e0db] bg-[#f5f2ef] dark:border-[#293140] dark:bg-[#151a23]",
  pending: "border-[#ece7e3] bg-white dark:border-[#293140] dark:bg-[#121722]",
  overdue: "border-[#f1c7bd] bg-[#fff6f3]",
  active: "border-[#f4d5cb] bg-[#fff8f5]",
  completed: "border-[#cce7d2] bg-[#f6fbf7] dark:border-[#3d3620] dark:bg-[#1b1a13]",
  partially_completed: "border-[#f1dfb7] bg-[#fffbf0]",
};

const calendarBadgeToneClasses: Record<CalendarDayTone, string> = {
  rest: "bg-[#e9e4df] text-[#667080] dark:bg-[#242b36] dark:text-[#c7cfdb]",
  pending: "bg-[#eef1f4] text-[#667080] dark:bg-[#242b36] dark:text-[#c7cfdb]",
  overdue: "bg-[#ffe4dc] text-[#b63d31]",
  active: "bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]",
  completed: "bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]",
  partially_completed: "bg-[#fff1c9] text-[#9a6a12]",
};

const calendarIconToneClasses: Record<CalendarDayTone, string> = {
  rest: "border-[#d8d1ca] text-[#8b929d] dark:border-[#5f6a7b] dark:text-[#d6dbe3]",
  pending: "border-[#c9cdd3] text-[#667080] dark:border-[#5f6a7b] dark:text-[#d6dbe3]",
  overdue:
    "border-[var(--portal-accent)] bg-[var(--portal-accent)] text-[var(--portal-accent-on)]",
  active:
    "border-[var(--portal-accent)] bg-[var(--portal-accent)] text-[var(--portal-accent-on)]",
  completed:
    "border-[var(--portal-accent)] bg-[var(--portal-accent)] text-[var(--portal-accent-on)]",
  partially_completed: "border-[#d8a21b] bg-[#d8a21b] text-white",
};

const calendarButtonToneClasses: Record<CalendarDayTone, string> = {
  rest: "border border-[#e4dfda] bg-[#f4f1ef] text-[#8b929d]",
  pending: "bg-[#121722] text-white shadow-[0_10px_24px_rgba(18,23,34,0.16)]",
  overdue:
    "bg-[var(--portal-accent)] text-[var(--portal-accent-on)] shadow-[0_10px_24px_var(--portal-accent-shadow)]",
  active:
    "bg-[var(--portal-accent)] text-[var(--portal-accent-on)] shadow-[0_10px_24px_var(--portal-accent-shadow)]",
  completed: "bg-[#121722] text-white shadow-[0_10px_24px_rgba(18,23,34,0.16)]",
  partially_completed:
    "bg-[#121722] text-white shadow-[0_10px_24px_rgba(18,23,34,0.16)]",
};

const calendarLabelToneClasses: Record<CalendarDayTone, string> = {
  rest: "text-[#667080] dark:text-[#c7cfdb]",
  pending: "text-[var(--portal-accent)]",
  overdue: "text-[var(--portal-accent)]",
  active: "text-[var(--portal-accent)]",
  completed: "text-[var(--portal-accent)]",
  partially_completed: "text-[#9a6a12]",
};

const mobileCalendarStatusToneClasses: Record<CalendarDayTone, string> = {
  rest: "border-border bg-background text-muted-foreground",
  pending: "border-primary/80 text-primary",
  overdue: "border-red-500 text-red-600 dark:border-red-400 dark:text-red-300",
  active: "border-primary bg-primary text-primary-foreground",
  completed:
    "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-500 dark:text-emerald-950",
  partially_completed:
    "border-amber-500 bg-amber-500 text-white dark:border-amber-300 dark:bg-amber-400 dark:text-amber-950",
};

export function PinAccessScreen({ token }: { token: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pin, setPin] = useState("");
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const digits = 6;

  const submitPin = useCallback(
    async (value: string) => {
      if (value.length !== digits) return;
      setState("loading");
      setError(null);
      try {
        const result = await verifyPin(token, value);
        if (result.success) {
          router.replace(`/c/${encodeURIComponent(token)}/home`);
          return;
        }
        if (result.locked) {
          setError(formatPortalLockMessage(result.lockedUntil));
        } else {
          setError(
            `PIN incorrecto. Intentos restantes: ${result.remainingAttempts}.`,
          );
        }
        setPin("");
      } catch (caught) {
        setPin("");
        setError(errorMessage(caught, "No pudimos validar el PIN."));
      } finally {
        setState("idle");
      }
    },
    [router, token],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handlePinChange(value: string) {
    if (state === "loading") return;

    const nextPin = value.replace(/\D/g, "").slice(0, digits);
    setPin(nextPin);
    setError(null);

    if (nextPin.length === digits) {
      void submitPin(nextPin);
    }
  }

  return (
    <ClientPortalShell token={token}>
      <section className="client-portal-viewport flex flex-col px-8 py-12 md:px-10 lg:px-12">
        <div className="mb-12">
          <BrandMark />
          <h1 className="mt-10 text-3xl font-bold">CoraFit</h1>
          <p className="mt-10 max-w-[250px] text-base font-medium leading-7 text-[#4e5968]">
            Ingresa tu PIN para acceder a tu portal
          </p>
        </div>
        <input
          aria-label="PIN de acceso"
          autoComplete="one-time-code"
          className="sr-only"
          disabled={state === "loading"}
          enterKeyHint="done"
          inputMode="numeric"
          maxLength={digits}
          onChange={(event) => handlePinChange(event.target.value)}
          pattern="[0-9]*"
          ref={inputRef}
          value={pin}
        />
        <button
          aria-label="Ingresar PIN"
          className="grid w-full grid-cols-6 gap-2"
          onClick={() => inputRef.current?.focus()}
          onPointerDown={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          tabIndex={-1}
          type="button"
        >
          {Array.from({ length: digits }).map((_, index) => (
            <span
              className={cn(
                "flex h-12 items-center justify-center rounded-xl border border-[#ece7e3] bg-white text-lg font-bold shadow-sm",
                pin[index] && "border-[var(--portal-accent)] bg-[#fff3f0]",
              )}
              key={index}
            >
              {pin[index] ? "•" : ""}
            </span>
          ))}
        </button>
        <div className="mt-6 min-h-8 text-center text-sm font-semibold text-[var(--portal-accent)]">
          {state === "loading" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Validando
            </span>
          ) : (
            error
          )}
        </div>
        <button
          className="mt-4 text-sm font-bold text-[#3b5f9f]"
          onClick={() => {
            setError(
              "Pide a tu coach que regenere tu acceso y te comparta un nuevo PIN.",
            );
            inputRef.current?.focus();
          }}
          type="button"
        >
          ¿Olvidaste tu PIN?
        </button>
        <button
          className="mt-auto text-sm font-bold text-[#667080] disabled:opacity-50"
          disabled={state === "loading" || !pin}
          onClick={() => {
            setPin("");
            inputRef.current?.focus();
          }}
          type="button"
        >
          Borrar PIN
        </button>
        <p className="mt-10 text-center text-sm leading-6 text-[#8b929d]">
          Tu coach te compartio un link privado y un PIN.
        </p>
      </section>
    </ClientPortalShell>
  );
}

export function WeeklyCalendarScreen({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const date = searchParams.get("date");
  const [data, setData] = useState<ClientPortalCalendar | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isWeekRefreshing, setIsWeekRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [openingDate, setOpeningDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pendingWeekNavigation, setPendingWeekNavigation] =
    useState<PendingWeekNavigation | null>(null);
  const [selectedProgress, setSelectedProgress] = useState<{
    logId: string;
    value: CalendarProgress | null;
  } | null>(null);
  const calendarCoordinatorRef = useRef(
    createLatestCalendarRequestCoordinator<ClientPortalCalendar>(),
  );
  const loadedCalendarRef = useRef<ClientPortalCalendar | null>(null);
  const pendingWeekNavigationRef = useRef<PendingWeekNavigation | null>(null);
  const pendingMobileFocusDateRef = useRef<string | null>(null);
  const progressCoordinatorRef = useRef(
    createLatestRequestCoordinator<CalendarProgress | null>(),
  );
  const selectedDateRef = useRef<string | null>(null);

  const updateSelectedDate = useCallback((nextDate: string | null) => {
    selectedDateRef.current = nextDate;
    setSelectedDate(nextDate);
  }, []);

  const load = useCallback(() => {
    const hasLoadedCalendar = Boolean(loadedCalendarRef.current?.calendar);
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    let cancelled = false;
    let request: CoordinatedRequest<ClientPortalCalendar> | null = null;

    Promise.resolve()
      .then(() => {
        if (cancelled) return;

        const activePendingNavigation = getActivePendingWeekNavigation(
          pendingWeekNavigationRef.current,
          date,
        );
        if (pendingWeekNavigationRef.current !== activePendingNavigation) {
          pendingWeekNavigationRef.current = null;
          setPendingWeekNavigation(null);
        }
        if (hasLoadedCalendar) {
          setIsWeekRefreshing(true);
        } else {
          setIsInitialLoading(true);
        }
        if (!hasLoadedCalendar) {
          setError(null);
        }

        request = calendarCoordinatorRef.current.run({
          load: (signal) =>
            clientPortalRequest<ClientPortalCalendar>(
              `/client-portal/${encodeURIComponent(token)}/calendar${query}`,
              { signal },
            ),
          onError: (caught) => {
            const message = errorMessage(
              caught,
              "No pudimos cargar el calendario.",
            );
            pendingWeekNavigationRef.current = null;
            setPendingWeekNavigation(null);

            if (hasLoadedCalendar) {
              setRefreshError(message);
              const loadedAnchorDate =
                selectedDateRef.current ??
                loadedCalendarRef.current?.calendar?.referenceDate;
              if (loadedAnchorDate && date !== loadedAnchorDate) {
                router.replace(
                  `/c/${encodeURIComponent(token)}/calendar?date=${encodeURIComponent(loadedAnchorDate)}`,
                  { scroll: false },
                );
              }
            } else {
              setError(message);
            }
          },
          onResult: (result) => {
            const nextDays = result.calendar?.days ?? [];
            const targetDate = date ?? null;
            const requestedDateForLoadedWeek = isDateInsideCalendarDays(
              nextDays,
              targetDate,
            )
              ? targetDate
              : null;
            const nextSelectedDay = selectMobileCalendarDay(nextDays, {
              requestedDate: requestedDateForLoadedWeek,
              selectedDate: null,
              today: result.calendar?.today ?? "",
            });

            loadedCalendarRef.current = result;
            pendingWeekNavigationRef.current = null;
            setData(result);
            setError(null);
            updateSelectedDate(nextSelectedDay?.date ?? null);
            setSelectedProgress(null);
            setPendingWeekNavigation(null);
          },
        });

        void request.settled.finally(() => {
          if (cancelled) return;
          setIsInitialLoading(false);
          setIsWeekRefreshing(false);
        });
      });

    return () => {
      cancelled = true;
      request?.cancel();
    };
  }, [date, router, token, updateSelectedDate]);

  useEffect(load, [load]);

  async function open(day: ClientPortalDay) {
    if (!day.session) return;
    if (day.log) {
      router.push(`/c/${encodeURIComponent(token)}/session/${day.log.id}`);
      return;
    }
    if (!day.canOpen) {
      router.push(
        `/c/${encodeURIComponent(token)}/session-preview?date=${encodeURIComponent(day.date)}&session=${encodeURIComponent(day.session.id)}`,
      );
      return;
    }
    setOpeningDate(day.date);
    try {
      const log = await clientPortalRequest<ClientSessionLog>(
        `/client-portal/${encodeURIComponent(token)}/session-logs/open`,
        {
          method: "POST",
          body: JSON.stringify({
            scheduledDate: day.date,
            trainingSessionId: day.session.id,
          }),
        },
      );
      router.push(`/c/${encodeURIComponent(token)}/session/${log.id}`);
    } catch (caught) {
      setError(errorMessage(caught, "No pudimos abrir la sesion."));
    } finally {
      setOpeningDate(null);
    }
  }

  const days = data?.calendar?.days ?? [];
  const requestedDateForLoadedWeek = isDateInsideCalendarDays(days, date)
    ? date
    : null;
  const selectedDay = selectCalendarDay(days, {
    selectedDate,
    today: data?.calendar?.today ?? "",
  });
  const mobileSelectedDay = selectMobileCalendarDay(days, {
    requestedDate: requestedDateForLoadedWeek,
    selectedDate,
    today: data?.calendar?.today ?? "",
  });
  const upcomingDays = selectedDay
    ? getUpcomingCalendarDays(days, selectedDay.date)
    : [];
  const mobileUpcomingDays = mobileSelectedDay
    ? getUpcomingCalendarDays(days, mobileSelectedDay.date)
    : [];
  const weekNavigation = data?.calendar
    ? getCalendarWeekNavigationState({
        durationWeeks: data.assignment?.assignedPlan.durationWeeks,
        weekNumber: data.calendar.weekNumber,
      })
    : { canNavigateNext: false, canNavigatePrevious: false };
  const mobileSelectedDate = mobileSelectedDay?.date ?? null;
  const selectedLogId = mobileSelectedDay?.log?.id ?? null;

  useEffect(() => {
    if (!selectedLogId) return;

    const logId = selectedLogId;
    const mobileMedia = window.matchMedia("(max-width: 767px)");
    let cancelCurrentRequest: () => void = () => undefined;

    function loadSelectedProgress() {
      cancelCurrentRequest();
      cancelCurrentRequest = () => undefined;
      if (!mobileMedia.matches) return;

      const requestKey = `${token}:${logId}`;
      const request = progressCoordinatorRef.current.run(
        requestKey,
        () =>
          clientPortalRequest<ClientSessionLog>(
            `/client-portal/${encodeURIComponent(token)}/session-logs/${encodeURIComponent(logId)}`,
          ).then((log) => getCalendarProgress(log.snapshotData)),
        (progress) => {
          setSelectedProgress({ logId, value: progress });
        },
      );
      cancelCurrentRequest = request.cancel;
      void request.settled;
    }

    loadSelectedProgress();
    mobileMedia.addEventListener("change", loadSelectedProgress);

    return () => {
      cancelCurrentRequest();
      mobileMedia.removeEventListener("change", loadSelectedProgress);
    };
  }, [selectedLogId, token]);

  useEffect(() => {
    const focusDate = pendingMobileFocusDateRef.current;
    if (!focusDate || focusDate !== mobileSelectedDate) return;

    const frame = requestAnimationFrame(() => {
      document
        .getElementById(mobileCalendarDayId(focusDate))
        ?.focus({ preventScroll: true });
      pendingMobileFocusDateRef.current = null;
    });

    return () => cancelAnimationFrame(frame);
  }, [mobileSelectedDate]);

  function selectUpcomingMobileDate(selectedUpcomingDate: string) {
    pendingMobileFocusDateRef.current = selectedUpcomingDate;
    updateSelectedDate(selectedUpcomingDate);
  }

  function navigateWeek(
    direction: WeekNavigationDirection,
    anchorDate: string,
  ) {
    if (pendingWeekNavigationRef.current) return;

    const targetDate = getWeekNavigationTarget(anchorDate, direction);
    const nextPendingNavigation = { direction, targetDate };
    pendingWeekNavigationRef.current = nextPendingNavigation;
    setPendingWeekNavigation(nextPendingNavigation);
    setIsWeekRefreshing(true);
    setError(null);
    setRefreshError(null);
    router.push(
      `/c/${encodeURIComponent(token)}/calendar?date=${encodeURIComponent(targetDate)}`,
      { scroll: false },
    );
  }

  return (
    <ClientPortalShell token={token} active="calendar">
      <section className="px-6 pt-6 md:px-8 lg:px-10 lg:pt-8">
        <header className="hidden lg:block">
          <h1 className="text-4xl font-bold tracking-normal text-[#09111f]">
            Calendario
          </h1>
          <p className="mt-3 text-base font-medium text-[#667080]">
            Revisa tus sesiones programadas y tu avance de la semana.
          </p>
        </header>
        {isInitialLoading ? (
          <ScreenState title="Cargando calendario" compact />
        ) : null}
        {error ? <InlineError message={error} /> : null}
        {refreshError ? <InlineError message={refreshError} /> : null}
        {data?.calendar ? (
          <>
            <header className="md:hidden">
              <h1 className="truncate text-2xl font-bold tracking-normal text-foreground">
                Calendario
              </h1>
              <div className="mt-2 flex min-h-10 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold capitalize text-primary">
                    {formatCalendarMonth(
                      mobileSelectedDay?.date ?? data.calendar.referenceDate,
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Semana {data.calendar.weekNumber}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <WeekButton
                    anchorDate={
                      mobileSelectedDay?.date ?? data.calendar.referenceDate
                    }
                    busy={pendingWeekNavigation?.direction === "prev"}
                    disabled={
                      isWeekRefreshing || !weekNavigation.canNavigatePrevious
                    }
                    direction="prev"
                    onNavigate={navigateWeek}
                  />
                  <WeekButton
                    anchorDate={
                      mobileSelectedDay?.date ?? data.calendar.referenceDate
                    }
                    busy={pendingWeekNavigation?.direction === "next"}
                    disabled={
                      isWeekRefreshing || !weekNavigation.canNavigateNext
                    }
                    direction="next"
                    onNavigate={navigateWeek}
                  />
                </div>
              </div>
            </header>
            <div className="mt-5 hidden items-center gap-3 md:flex lg:mt-8 lg:max-w-3xl">
              <WeekButton
                anchorDate={selectedDay?.date ?? data.calendar.referenceDate}
                busy={pendingWeekNavigation?.direction === "prev"}
                disabled={isWeekRefreshing || !weekNavigation.canNavigatePrevious}
                direction="prev"
                onNavigate={navigateWeek}
              />
            <div className="flex-1 rounded-xl border border-[#ece7e3] bg-white py-3 text-center text-sm font-bold text-[#09111f] shadow-sm dark:border-[#293140] dark:bg-[#121722] dark:text-[#f4f6f8]">
                {formatDate(data.calendar.weekStartDate)} -{" "}
                {formatDate(data.calendar.weekEndDate)}
              </div>
              <WeekButton
                anchorDate={selectedDay?.date ?? data.calendar.referenceDate}
                busy={pendingWeekNavigation?.direction === "next"}
                disabled={isWeekRefreshing || !weekNavigation.canNavigateNext}
                direction="next"
                onNavigate={navigateWeek}
              />
            </div>
            <div className="mt-5 hidden space-y-3 md:block lg:hidden">
              {data.calendar.days.map((day) => (
                <CalendarDayCard
                  day={day}
                  key={day.date}
                  loading={openingDate === day.date}
                  onOpen={() => void open(day)}
                />
              ))}
            </div>
            {mobileSelectedDay ? (
              <div className="md:hidden">
                <MobileCalendarWeekStrip
                  days={data.calendar.days}
                  onSelect={updateSelectedDate}
                  selectedDate={mobileSelectedDay.date}
                />
                <MobileSelectedSessionCard
                  day={mobileSelectedDay}
                  loading={openingDate === mobileSelectedDay.date}
                  onOpen={() => void open(mobileSelectedDay)}
                  progress={
                    selectedProgress?.logId === selectedLogId
                      ? selectedProgress.value
                      : null
                  }
                />
                <MobileUpcomingDays
                  days={mobileUpcomingDays}
                  onSelect={selectUpcomingMobileDate}
                />
              </div>
            ) : null}
            <div className="mt-5 hidden grid-cols-7 gap-3 lg:grid">
              {data.calendar.days.map((day) => (
                <CalendarWeekCell
                  day={day}
                  selected={day.date === selectedDay?.date}
                  key={day.date}
                  onSelect={() => updateSelectedDate(day.date)}
                />
              ))}
            </div>
            {selectedDay ? (
              <div className="hidden lg:block">
                <CalendarLegend />
                <SelectedSessionCard
                  day={selectedDay}
                  loading={openingDate === selectedDay.date}
                  onOpen={() => void open(selectedDay)}
                />
                <UpcomingDays days={upcomingDays} />
              </div>
            ) : null}
          </>
        ) : !isInitialLoading ? (
          <EmptyCard title={calendarStateTitle(data?.state)} />
        ) : null}
      </section>
    </ClientPortalShell>
  );
}

export function SessionScreen({
  token,
  sessionLogId,
}: {
  token: string;
  sessionLogId: string;
}) {
  const router = useRouter();
  const [log, setLog] = useState<ClientSessionLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmPartialOpen, setConfirmPartialOpen] = useState(false);

  const load = useCallback(() => {
    clientPortalRequest<ClientSessionLog>(
      `/client-portal/${encodeURIComponent(token)}/session-logs/${encodeURIComponent(sessionLogId)}`,
    )
      .then((result) => {
        setLog(result);
        const completedIds =
          result.snapshotData.progress?.completedExerciseIds ?? [];
        const firstPendingIndex = result.snapshotData.exercises.findIndex(
          (exercise) => !completedIds.includes(exercise.sessionExerciseId),
        );
        setActiveExerciseIndex(firstPendingIndex >= 0 ? firstPendingIndex : 0);
      })
      .catch((caught) =>
        setError(errorMessage(caught, "No pudimos cargar la sesion.")),
      )
      .finally(() => setLoading(false));
  }, [sessionLogId, token]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!log || !isFinalized(log.status)) return;
    router.replace(
      `/c/${encodeURIComponent(token)}/session/${encodeURIComponent(sessionLogId)}/completed`,
    );
  }, [log, router, sessionLogId, token]);

  async function complete(sessionExerciseId: string) {
    if (isFinalized(log?.status)) return;
    setBusyId(sessionExerciseId);
    try {
      const updated = await clientPortalRequest<ClientSessionLog>(
        `/client-portal/${encodeURIComponent(token)}/session-logs/${encodeURIComponent(sessionLogId)}/exercises/${encodeURIComponent(sessionExerciseId)}/complete`,
        { method: "POST" },
      );
      setLog(updated);
      const updatedCompleted =
        updated.snapshotData.progress?.completedExerciseIds ?? [];
      const completedIndex = updated.snapshotData.exercises.findIndex(
        (exercise) => exercise.sessionExerciseId === sessionExerciseId,
      );
      const orderedExercises = [
        ...updated.snapshotData.exercises.slice(completedIndex + 1),
        ...updated.snapshotData.exercises.slice(0, Math.max(completedIndex, 0)),
      ];
      const nextPendingExercise = orderedExercises.find(
        (exercise) => !updatedCompleted.includes(exercise.sessionExerciseId),
      );
      const nextPendingIndex = nextPendingExercise
        ? updated.snapshotData.exercises.findIndex(
            (exercise) =>
              exercise.sessionExerciseId ===
              nextPendingExercise.sessionExerciseId,
          )
        : -1;
      if (nextPendingIndex >= 0) setActiveExerciseIndex(nextPendingIndex);
      if (detailOpen && nextPendingIndex >= 0) setDetailOpen(true);
    } catch (caught) {
      setError(errorMessage(caught, "No pudimos completar el ejercicio."));
    } finally {
      setBusyId(null);
    }
  }

  async function applyAlternative(
    sessionExerciseId: string,
    alternativeId: string,
  ) {
    if (isFinalized(log?.status)) return;
    setBusyId(sessionExerciseId);
    try {
      const updated = await clientPortalRequest<ClientSessionLog>(
        `/client-portal/${encodeURIComponent(token)}/session-logs/${encodeURIComponent(sessionLogId)}/exercises/${encodeURIComponent(sessionExerciseId)}/use-alternative`,
        {
          method: "POST",
          body: JSON.stringify({ alternativeId }),
        },
      );
      setLog(updated);
    } catch (caught) {
      setError(errorMessage(caught, "No pudimos usar esta alternativa."));
    } finally {
      setBusyId(null);
    }
  }

  async function finalize({ rethrow = false }: { rethrow?: boolean } = {}) {
    setFinalizing(true);
    try {
      await clientPortalRequest<ClientSessionLog>(
        `/client-portal/${encodeURIComponent(token)}/session-logs/${encodeURIComponent(sessionLogId)}/finalize`,
        { method: "POST" },
      );
      router.push(
        `/c/${encodeURIComponent(token)}/session/${encodeURIComponent(sessionLogId)}/completed`,
      );
    } catch (caught) {
      setError(
        errorMessage(
          caught,
          "Completa al menos un ejercicio antes de finalizar.",
        ),
      );
      if (rethrow) throw caught;
    } finally {
      setFinalizing(false);
    }
  }

  function requestFinalize(completedCount: number, totalExercises: number) {
    if (completedCount === 0) {
      setError("Completa al menos un ejercicio antes de finalizar.");
      return;
    }
    if (completedCount < totalExercises) {
      setConfirmPartialOpen(true);
      return;
    }
    void finalize();
  }

  if (loading)
    return (
      <ClientPortalShell token={token}>
        <ScreenState title="Cargando sesion" />
      </ClientPortalShell>
    );
  if (!log)
    return (
      <ClientPortalShell token={token}>
        <ScreenState
          title="Sesion no disponible"
          description={error ?? undefined}
        />
      </ClientPortalShell>
    );

  const completed = log.snapshotData.progress?.completedExerciseIds ?? [];
  const total = log.snapshotData.exercises.length;
  const pendingCount = Math.max(total - completed.length, 0);
  const activeExercise =
    log.snapshotData.exercises[activeExerciseIndex] ??
    log.snapshotData.exercises[0];
  const selectedAlternativeId = activeExercise
    ? (log.snapshotData.progress?.usedAlternatives.find(
        (alternative) =>
          alternative.sessionExerciseId === activeExercise.sessionExerciseId,
      )?.alternativeId ?? null)
    : null;

  if (isFinalized(log.status))
    return (
      <ClientPortalShell token={token}>
        <ScreenState title="Abriendo tu logro" />
      </ClientPortalShell>
    );

  return (
    <ClientPortalShell token={token}>
      <section className="px-5 pt-6 md:px-8 lg:px-10 lg:pt-8">
        {!detailOpen ? (
          <SessionBackLink href={`/c/${encodeURIComponent(token)}/calendar`} />
        ) : null}
        {error ? <InlineError message={error} /> : null}
        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
          <div className="min-w-0">
            {detailOpen && activeExercise ? (
              <ClientExerciseDetailView
                completed={completed.includes(activeExercise.sessionExerciseId)}
                completedCount={completed.length}
                exercise={activeExercise}
                index={activeExerciseIndex}
                loading={busyId === activeExercise.sessionExerciseId}
                onBack={() => setDetailOpen(false)}
                onComplete={() =>
                  void complete(activeExercise.sessionExerciseId)
                }
                onFinalize={() => requestFinalize(completed.length, total)}
                onNext={() =>
                  setActiveExerciseIndex((current) =>
                    Math.min(current + 1, total - 1),
                  )
                }
                onPrevious={() =>
                  setActiveExerciseIndex((current) => Math.max(current - 1, 0))
                }
                onSave={() =>
                  router.push(`/c/${encodeURIComponent(token)}/home`)
                }
                onUseAlternative={(alternativeId) =>
                  void applyAlternative(
                    activeExercise.sessionExerciseId,
                    alternativeId,
                  )
                }
                readOnly={false}
                selectedAlternativeId={selectedAlternativeId}
                total={total}
              />
            ) : activeExercise ? (
              <>
                <div className="rounded-xl border border-[#ece7e3] bg-white p-4 shadow-sm dark:border-[#293140] dark:bg-[#121722] lg:hidden">
                  <div className="flex items-center justify-between text-sm font-bold text-[#09111f] dark:text-[#f4f6f8]">
                    <span>Progreso de la sesion</span>
                    <span>
                      {completed.length} / {total}
                    </span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-[#f0eeee] dark:bg-[#242b36]">
                    <div
                      className="h-2 rounded-full bg-[var(--portal-accent)]"
                      style={{
                        width: `${total ? (completed.length / total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-3 lg:mt-0">
                  {log.snapshotData.exercises.map((exercise, index) => (
                    <SessionExerciseListCard
                      completed={completed.includes(exercise.sessionExerciseId)}
                      exercise={exercise}
                      index={index}
                      key={exercise.sessionExerciseId}
                      loading={busyId === exercise.sessionExerciseId}
                      onComplete={() =>
                        void complete(exercise.sessionExerciseId)
                      }
                      onOpen={() => {
                        setActiveExerciseIndex(index);
                        setDetailOpen(true);
                      }}
                    />
                  ))}
                </div>
                <div className="sticky bottom-0 -mx-5 mt-8 grid grid-cols-2 gap-3 border-t border-[#ece7e3] bg-white/95 px-5 py-5 backdrop-blur dark:border-[#293140] dark:bg-[#0d1016]/95 lg:hidden">
                  <button
                    className="flex h-14 items-center justify-center gap-2 rounded-xl border border-[var(--portal-accent)] text-sm font-bold text-[var(--portal-accent)]"
                    onClick={() =>
                      router.push(`/c/${encodeURIComponent(token)}/home`)
                    }
                    type="button"
                  >
                    <Home className="size-4" /> Guardar y salir
                  </button>
                  <button
                    className="flex h-14 items-center justify-center gap-2 rounded-xl bg-[var(--portal-accent)] text-sm font-bold text-[var(--portal-accent-on)] shadow-[0_10px_24px_var(--portal-accent-shadow)] disabled:opacity-60"
                    disabled={finalizing}
                    onClick={() => requestFinalize(completed.length, total)}
                    type="button"
                  >
                    {finalizing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RotateCcw className="size-4" />
                    )}{" "}
                    Finalizar sesion
                  </button>
                </div>
              </>
            ) : (
              <EmptyCard title="No hay ejercicios en esta sesion." />
            )}
            {detailOpen ? (
              <ExerciseMiniNavigation
                activeIndex={activeExerciseIndex}
                completedIds={completed}
                exercises={log.snapshotData.exercises}
                onSelect={setActiveExerciseIndex}
              />
            ) : null}
          </div>
          <SessionProgressPanel
            completedCount={completed.length}
            finalizing={finalizing}
            onFinalize={() => requestFinalize(completed.length, total)}
            onSave={() => router.push(`/c/${encodeURIComponent(token)}/home`)}
            pendingCount={pendingCount}
            total={total}
          />
        </div>
      </section>
      <ConfirmDialog
        open={confirmPartialOpen}
        onOpenChange={setConfirmPartialOpen}
        title="¿Finalizar sesión incompleta?"
        description={`Te faltan ${pendingCount} ejercicios. Si finalizas ahora, la sesión quedará registrada como parcial.`}
        cancelLabel="Seguir entrenando"
        confirmLabel="Finalizar de todos modos"
        isLoading={finalizing}
        onConfirm={() => finalize({ rethrow: true })}
      />
    </ClientPortalShell>
  );
}

export function SessionPreviewScreen({ token }: { token: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const sessionId = searchParams.get("session");
  const missingParams = !date || !sessionId;
  const [preview, setPreview] = useState<ClientSessionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (missingParams) return;

    let alive = true;
    clientPortalRequest<ClientSessionPreview>(
      `/client-portal/${encodeURIComponent(token)}/session-logs/preview?scheduledDate=${encodeURIComponent(date)}&trainingSessionId=${encodeURIComponent(sessionId)}`,
    )
      .then((result) => {
        if (alive) setPreview(result);
      })
      .catch((caught) => {
        if (alive)
          setError(
            errorMessage(caught, "No pudimos cargar la vista de lectura."),
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [date, missingParams, sessionId, token]);

  if (missingParams) {
    return (
      <ClientPortalShell token={token}>
        <ScreenState
          title="Sesion no disponible"
          description="No pudimos identificar la sesion programada."
        />
      </ClientPortalShell>
    );
  }
  if (loading)
    return (
      <ClientPortalShell token={token}>
        <ScreenState title="Cargando sesion" />
      </ClientPortalShell>
    );
  if (!preview)
    return (
      <ClientPortalShell token={token}>
        <ScreenState
          title="Sesion no disponible"
          description={error ?? undefined}
        />
      </ClientPortalShell>
    );

  const total = preview.snapshotData.exercises.length;
  const activeExercise =
    preview.snapshotData.exercises[activeExerciseIndex] ??
    preview.snapshotData.exercises[0];

  return (
    <ClientPortalShell token={token}>
      <section className="px-5 pt-6 md:px-8 lg:px-10 lg:pt-8">
        {!detailOpen ? (
          <SessionBackLink href={`/c/${encodeURIComponent(token)}/calendar`} />
        ) : null}
        {error ? <InlineError message={error} /> : null}
        <div className="mt-6 rounded-xl border border-[#f5dfda] bg-[#fff8f7] p-4 text-sm font-semibold leading-6 text-[#8b3c31] dark:border-[#4b2b24] dark:bg-[#271716] dark:text-[#ffb4a8]">
          Esta sesion esta programada para despues. Puedes revisar ejercicios y
          notas, pero todavia no se puede iniciar.
        </div>
        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
          <div className="min-w-0">
            {detailOpen && activeExercise ? (
              <ClientExerciseDetailView
                completed={false}
                completedCount={0}
                exercise={activeExercise}
                index={activeExerciseIndex}
                loading={false}
                onBack={() => setDetailOpen(false)}
                onComplete={() => undefined}
                onFinalize={() => undefined}
                onNext={() =>
                  setActiveExerciseIndex((current) =>
                    Math.min(current + 1, total - 1),
                  )
                }
                onPrevious={() =>
                  setActiveExerciseIndex((current) => Math.max(current - 1, 0))
                }
                onSave={() =>
                  router.push(`/c/${encodeURIComponent(token)}/calendar`)
                }
                onUseAlternative={() => undefined}
                readOnly
                selectedAlternativeId={null}
                total={total}
              />
            ) : activeExercise ? (
              <>
                <div className="rounded-xl border border-[#ece7e3] bg-white p-4 shadow-sm dark:border-[#293140] dark:bg-[#121722]">
                  <div className="flex items-center justify-between text-sm font-bold text-[#09111f] dark:text-[#f4f6f8]">
                    <span>Vista de lectura</span>
                    <span>{total} ejercicios</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-[#f0eeee] dark:bg-[#242b36]" />
                </div>
                <div className="mt-4 space-y-3">
                  {preview.snapshotData.exercises.map((exercise, index) => (
                    <SessionExerciseListCard
                      completed={false}
                      exercise={exercise}
                      index={index}
                      key={exercise.sessionExerciseId}
                      loading={false}
                      readOnly
                      onComplete={() => undefined}
                      onOpen={() => {
                        setActiveExerciseIndex(index);
                        setDetailOpen(true);
                      }}
                    />
                  ))}
                </div>
                <div className="sticky bottom-0 -mx-5 mt-8 border-t border-[#ece7e3] bg-white/95 px-5 py-5 backdrop-blur dark:border-[#293140] dark:bg-[#0d1016]/95 lg:hidden">
                  <button
                    className="flex h-14 w-full items-center justify-center rounded-xl bg-[#ece7e3] text-sm font-bold text-[#667080] dark:bg-[#242b36] dark:text-[#c7cfdb]"
                    disabled
                    type="button"
                  >
                    Disponible en la fecha programada
                  </button>
                </div>
              </>
            ) : (
              <EmptyCard title="No hay ejercicios en esta sesion." />
            )}
            {detailOpen ? (
              <ExerciseMiniNavigation
                activeIndex={activeExerciseIndex}
                completedIds={[]}
                exercises={preview.snapshotData.exercises}
                onSelect={setActiveExerciseIndex}
                readOnly
              />
            ) : null}
          </div>
          <SessionProgressPanel
            completedCount={0}
            finalizing={false}
            onFinalize={() => undefined}
            onSave={() =>
              router.push(`/c/${encodeURIComponent(token)}/calendar`)
            }
            pendingCount={total}
            readOnly
            total={total}
          />
        </div>
      </section>
    </ClientPortalShell>
  );
}

export function CompletionCardScreen({
  token,
  sessionLogId,
}: {
  token: string;
  sessionLogId: string;
}) {
  const [data, setData] = useState<CompletionCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareFallback, setShareFallback] = useState<string | null>(null);
  const [saveFallback, setSaveFallback] = useState<string | null>(null);
  const { resolvedTheme } = useAppTheme();

  useEffect(() => {
    clientPortalRequest<CompletionCard>(
      `/client-portal/${encodeURIComponent(token)}/session-logs/${encodeURIComponent(sessionLogId)}/completion-card`,
    )
      .then(setData)
      .catch((caught) =>
        setError(errorMessage(caught, "No pudimos cargar tu logro.")),
      );
  }, [sessionLogId, token]);

  function buildShareText(card: CompletionCard) {
    return [
      "CoraFit",
      "Sesion completada",
      card.sessionName,
      `${card.completedExercises}/${card.totalExercises} ejercicios`,
      `${card.completionPercentage}% completado`,
      `${card.streak} dias de racha`,
    ].join("\n");
  }

  async function shareCompletion() {
    if (!data) return;

    const shareData = {
      title: "CoraFit - Sesion completada",
      text: buildShareText(data),
    };

    setShareFallback(null);

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError")
          return;
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareData.text);
        setShareFallback(
          "Copiamos tu logro para que lo compartas donde prefieras.",
        );
        return;
      } catch {
        // Fall through to visible fallback.
      }
    }

    setShareFallback(
      "Tu navegador no permite compartir automaticamente. Puedes copiar el resumen de la card.",
    );
  }

  async function saveCompletionImage() {
    if (!data) return;

    setSaveFallback(null);

    const svg = buildCompletionCardSvg(data, resolvedTheme === "dark");
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    try {
      const image = new Image();
      const loaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
      });
      image.src = url;
      await loaded;

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas no disponible");

      context.drawImage(image, 0, 0);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `corafit-sesion-${data.scheduledDate}.png`;
      link.click();
    } catch {
      setSaveFallback(
        "No pudimos guardar la imagen automaticamente. Intenta compartir el resumen o vuelve a intentarlo.",
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <ClientPortalShell token={token}>
      <section className="client-portal-viewport flex flex-col px-5 py-6 md:px-8 lg:px-10">
        <BrandMark />
        {error ? <InlineError message={error} /> : null}
        {data ? (
          <div className="mx-auto mt-4 flex w-full max-w-md flex-1 flex-col">
            <CompletionShareCard data={data} />

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#111111] px-5 text-sm font-bold text-white transition hover:bg-[#39393b] focus:outline-none focus:ring-2 focus:ring-[#275dc5] focus:ring-offset-2"
                onClick={() => void shareCompletion()}
                type="button"
              >
                <Share2 className="size-4" />
                Compartir
              </button>
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#cacacb] bg-white px-5 text-sm font-bold text-[#111111] transition hover:border-[#707072] hover:bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#275dc5] focus:ring-offset-2 dark:border-[#2b3342] dark:bg-[#121722] dark:text-[#f4f6f8] dark:hover:bg-[#1a202b]"
                onClick={() => void saveCompletionImage()}
                type="button"
              >
                <Download className="size-4" />
                Guardar imagen
              </button>
            </div>

            {shareFallback ? (
              <div
                className="mt-3 rounded-xl border border-[#ece7e3] bg-white p-4 text-sm leading-6 text-[#667080]"
                role="status"
              >
                <p>{shareFallback}</p>
                <p className="mt-2 whitespace-pre-line font-medium text-[#09111f]">
                  {buildShareText(data)}
                </p>
              </div>
            ) : null}

            {saveFallback ? (
              <div
                className="mt-3 rounded-xl border border-[#f2c8c0] bg-[#fff4f1] p-4 text-sm font-semibold leading-6 text-[#9f3529]"
                role="status"
              >
                {saveFallback}
              </div>
            ) : null}
          </div>
        ) : (
          <ScreenState title="Preparando tu logro" compact />
        )}
        <div className="mt-auto space-y-3 pt-6">
          <Link
            className="flex h-14 items-center justify-center rounded-xl bg-[var(--portal-accent)] text-sm font-bold text-[var(--portal-accent-on)]"
            href={`/c/${encodeURIComponent(token)}/home`}
          >
            Volver al inicio
          </Link>
          <Link
            className="flex h-14 items-center justify-center rounded-xl border border-[#ece7e3] bg-white text-sm font-bold text-[#09111f] dark:border-[#2b3342] dark:bg-[#121722] dark:text-[#f4f6f8]"
            href={`/c/${encodeURIComponent(token)}/calendar`}
          >
            Ver calendario
          </Link>
        </div>
      </section>
    </ClientPortalShell>
  );
}

function CompletionShareCard({ data }: { data: CompletionCard }) {
  const dateParts = formatCompletionDateParts(data.scheduledDate);

  return (
    <article
      aria-label="Card compartible de sesion completada"
      className="relative w-full overflow-hidden rounded-[28px] border border-[#f2ece7] bg-white px-5 pb-5 pt-6 text-[#071026] shadow-[0_22px_60px_rgba(18,23,34,0.14)] dark:border-[#2b3342] dark:bg-[#121722] dark:text-[#f4f6f8] dark:shadow-none"
    >
      <div
        className="absolute left-1/2 top-6 h-24 w-32 -translate-x-1/2 text-[var(--portal-accent)]"
        aria-hidden
      >
        <span className="absolute left-1/2 top-0 h-7 w-px bg-current opacity-60" />
        <span className="absolute left-7 top-4 h-7 w-px rotate-[-50deg] bg-current opacity-50" />
        <span className="absolute right-7 top-4 h-7 w-px rotate-[50deg] bg-current opacity-50" />
        <span className="absolute left-1 top-14 h-px w-10 bg-current opacity-55" />
        <span className="absolute right-1 top-14 h-px w-10 bg-current opacity-55" />
      </div>

      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[var(--portal-accent-soft)]">
        <div className="flex size-14 items-center justify-center rounded-full bg-[#ffe1d9] text-[var(--portal-accent)] dark:bg-[var(--portal-accent-soft)]">
          <Check className="size-8 stroke-[3]" />
        </div>
      </div>

      <h2 className="mt-4 text-center text-[2rem] font-black leading-none text-[#071026] dark:text-[#f4f6f8]">
        Sesion completada
      </h2>

      <div className="mt-3 flex items-center justify-center gap-3 text-[var(--portal-accent)]">
        <span className="h-px w-10 bg-[var(--portal-accent)]/55" />
        <p className="line-clamp-1 text-base font-black">{data.sessionName}</p>
        <span className="h-px w-10 bg-[var(--portal-accent)]/55" />
      </div>

      <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-[22px] border border-[#ece7e3] bg-white shadow-[0_12px_32px_rgba(7,16,38,0.08)] dark:border-[#3a4354] dark:bg-[#0d1016] dark:shadow-none">
        <CompletionStoryMetric
          caption="completados"
          icon={<Dumbbell className="size-7 text-[var(--portal-accent)]" />}
          label="Ejercicios"
          value={`${data.completedExercises}/${data.totalExercises}`}
        />
        <CompletionStoryMetric
          caption="completado"
          icon={<TrendingUp className="size-7 text-[var(--portal-accent)]" />}
          label="Avance"
          value={`${data.completionPercentage}%`}
        />
        <CompletionStoryMetric
          caption="dias"
          icon={<Flame className="size-7 text-[var(--portal-accent)]" />}
          label="Racha"
          value={data.streak}
        />
        <CompletionStoryMetric
          caption="registrado"
          icon={<Calendar className="size-7 text-[var(--portal-accent)]" />}
          label="Fecha"
          value={dateParts.dayMonth}
          valueClassName="text-xl"
        />
      </div>

      <div className="mt-5 flex items-center gap-4 text-[var(--portal-accent)]">
        <span className="h-px flex-1 bg-[var(--portal-accent)]/45" />
        <span className="rounded-full border border-[#f4c8bd] bg-[var(--portal-accent-soft)] px-6 py-2 text-sm font-black dark:border-[#5d5124]">
          #CoraFit
        </span>
        <span className="h-px flex-1 bg-[var(--portal-accent)]/45" />
      </div>
    </article>
  );
}

function CompletionStoryMetric({
  caption,
  icon,
  label,
  value,
  valueClassName,
}: {
  caption: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-h-20 items-center gap-3 border-b border-r border-[#ece7e3] p-3 last:border-r-0 dark:border-[#3a4354] [&:nth-child(2n)]:border-r-0 [&:nth-child(n+3)]:border-b-0">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#fff0ec] dark:bg-[var(--portal-accent-soft)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#667080] dark:text-[#c7cfdb]">{label}</p>
        <p
          className={cn(
            "mt-1 break-words text-2xl font-black leading-none text-[#071026] dark:text-[#f4f6f8]",
            valueClassName,
          )}
        >
          {value}
        </p>
        <p className="mt-1 text-xs font-semibold text-[#667080] dark:text-[#c7cfdb]">{caption}</p>
      </div>
    </div>
  );
}

export function PlaceholderScreen({
  token,
  active,
  title,
}: {
  token: string;
  active: "progress" | "profile";
  title: string;
}) {
  return (
    <ClientPortalShell token={token} active={active}>
      <section className="px-6 pt-10 md:px-8 lg:px-10">
        <TopBar
          title={title}
          backHref={`/c/${encodeURIComponent(token)}/home`}
        />
        <div className="mt-10 rounded-[24px] border border-[#ece7e3] bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-[var(--portal-accent)]">
            Proximamente
          </p>
          <h1 className="mt-3 text-2xl font-bold">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#667080]">
            Esta seccion estara disponible proximamente.
          </p>
        </div>
      </section>
    </ClientPortalShell>
  );
}

type PortalProgressTab = "weight" | "measurements" | "photos" | "notes";

const portalProgressTabs: Array<{ key: PortalProgressTab; label: string }> = [
  { key: "weight", label: "Peso" },
  { key: "measurements", label: "Medidas" },
  { key: "photos", label: "Fotos" },
  { key: "notes", label: "Notas" },
];

const portalPhotoLabels: Record<ClientPortalProgressPhotoType, string> = {
  back: "Espalda",
  front: "Frente",
  other: "Otra",
  side: "Lado",
};

const portalMeasurementFields = [
  ["waistCm", "Cintura"],
  ["hipCm", "Cadera"],
  ["chestCm", "Pecho"],
  ["armCm", "Brazo"],
  ["legCm", "Pierna"],
  ["gluteCm", "Gluteo"],
] as const;

export function ClientPortalProgressScreen({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<PortalProgressTab>("weight");
  const [weightLogs, setWeightLogs] = useState<ClientPortalWeightLog[]>([]);
  const [measurements, setMeasurements] = useState<
    ClientPortalBodyMeasurement[]
  >([]);
  const [photos, setPhotos] = useState<ClientPortalProgressPhoto[]>([]);
  const [notes, setNotes] = useState<ClientPortalProgressNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weightSaving, setWeightSaving] = useState(false);
  const [deletingWeightId, setDeletingWeightId] = useState<string | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    setInitialError(null);
    try {
      const encoded = encodeURIComponent(token);
      const [weightResult, measurementResult, photoResult, noteResult] =
        await Promise.all([
          clientPortalRequest<ClientPortalWeightLog[]>(
            `/client-portal/${encoded}/progress/weight-logs`,
          ),
          clientPortalRequest<ClientPortalBodyMeasurement[]>(
            `/client-portal/${encoded}/progress/body-measurements`,
          ),
          clientPortalRequest<ClientPortalProgressPhoto[]>(
            `/client-portal/${encoded}/progress/photos`,
          ),
          clientPortalRequest<ClientPortalProgressNote[]>(
            `/client-portal/${encoded}/progress/notes`,
          ),
        ]);
      setWeightLogs(weightResult);
      setMeasurements(measurementResult);
      setPhotos(photoResult);
      setNotes(noteResult);
    } catch (caught) {
      setInitialError(errorMessage(caught, "No pudimos cargar tu progreso."));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProgress();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadProgress]);

  async function saveWeight(
    input: { note?: string | null; recordedAt: string; weightKg: number },
    id?: string,
  ): Promise<boolean> {
    setWeightSaving(true);
    setWeightError(null);
    try {
      const encoded = encodeURIComponent(token);
      const saved = await clientPortalRequest<ClientPortalWeightLog>(
        `/client-portal/${encoded}/progress/weight-logs${id ? `/${id}` : ""}`,
        {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(input),
        },
      );
      setWeightLogs((current) => upsertWeightLog(current, saved));
      return true;
    } catch (caught) {
      setWeightError(
        isForbidden(caught)
          ? "Tu coach no habilito el registro de peso o este registro no es editable."
          : errorMessage(caught, "No pudimos guardar el peso."),
      );
      return false;
    } finally {
      setWeightSaving(false);
    }
  }

  async function deleteWeight(id: string): Promise<boolean> {
    if (deletingWeightId !== null) {
      return false;
    }

    setDeletingWeightId(id);
    setWeightError(null);
    try {
      await clientPortalRequest(
        `/client-portal/${encodeURIComponent(token)}/progress/weight-logs/${id}`,
        { method: "DELETE" },
      );
      setWeightLogs((current) => deleteWeightLogById(current, id));
      return true;
    } catch (caught) {
      setWeightError(
        isForbidden(caught)
          ? "Solo puedes borrar registros de peso creados por ti."
          : errorMessage(caught, "No pudimos borrar el peso."),
      );
      return false;
    } finally {
      setDeletingWeightId(null);
    }
  }

  async function uploadPhoto(formData: FormData) {
    setSaving(true);
    setPhotoError(null);
    try {
      await clientPortalFormDataRequest(
        `/client-portal/${encodeURIComponent(token)}/progress/photos`,
        formData,
      );
      await loadProgress();
    } catch (caught) {
      setPhotoError(
        isForbidden(caught)
          ? "No tienes permiso para subir esta foto."
          : errorMessage(caught, "No pudimos subir la foto."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function deletePhoto(id: string) {
    setSaving(true);
    setPhotoError(null);
    try {
      await clientPortalRequest(
        `/client-portal/${encodeURIComponent(token)}/progress/photos/${id}`,
        { method: "DELETE" },
      );
      await loadProgress();
    } catch (caught) {
      setPhotoError(
        isForbidden(caught)
          ? "Solo puedes borrar fotos subidas por ti."
          : errorMessage(caught, "No pudimos borrar la foto."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ClientPortalShell token={token} active="progress">
      <section className="px-6 pt-8 md:px-8 lg:px-10 lg:pt-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
            Tu progreso
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Consulta tus registros compartidos y agrega avances cuando este
            habilitado.
          </p>
        </div>

        <Tabs
          className="mt-6"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as PortalProgressTab)}
        >
          <TabsList className="grid h-auto w-full grid-cols-4 rounded-2xl border border-border/70 bg-card p-1 shadow-[var(--surface-shadow-soft)]">
            {portalProgressTabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                className="min-h-11 rounded-xl px-2 text-sm font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
                value={tab.key}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {initialError ? (
            <div className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-semibold">{initialError}</p>
              <Button
                className="mt-3"
                disabled={loading}
                onClick={() => void loadProgress()}
                size="sm"
                type="button"
                variant="outline"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Reintentar
              </Button>
            </div>
          ) : null}
          {loading ? <ScreenState title="Cargando progreso" compact /> : null}
          {!loading && !initialError ? (
            <>
            <TabsContent value="weight">
              <PortalWeightSection
                deletingId={deletingWeightId}
                error={weightError}
                formSaving={weightSaving}
                items={weightLogs}
                onDelete={deleteWeight}
                onSave={saveWeight}
              />
            </TabsContent>
            <TabsContent value="measurements">
              <PortalMeasurementsSection items={measurements} />
            </TabsContent>
            <TabsContent value="photos">
              <PortalPhotosSection
                error={photoError}
                items={photos}
                saving={saving}
                onDelete={deletePhoto}
                onUpload={uploadPhoto}
              />
            </TabsContent>
            <TabsContent value="notes">
              <PortalNotesSection items={notes} />
            </TabsContent>
            </>
          ) : null}
        </Tabs>
      </section>
    </ClientPortalShell>
  );
}

export function ClientPortalSettingsScreen({ token }: { token: string }) {
  const { resolvedTheme, setTheme, theme } = useAppTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <ClientPortalShell token={token} active="settings">
      <section className="px-5 pb-10 pt-6 lg:px-10 lg:pt-10">
        <div className="rounded-[1.75rem] border border-[#ece7e3] bg-white p-5 shadow-[0_18px_50px_rgba(18,23,34,0.08)] dark:border-[#222936] dark:bg-[#121722] dark:shadow-none">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] ">
              <Settings className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--portal-accent)] ">
                Configuracion
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-[#09111f] dark:text-[#f4f6f8]">
                Preferencias del portal
              </h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#667080] dark:text-[#aab2bf]">
                Ajusta como quieres ver tu entrenamiento desde este dispositivo.
              </p>
            </div>
          </div>
        </div>

        <section className="mt-5 rounded-[1.5rem] border border-[#ece7e3] bg-white p-5 shadow-sm dark:border-[#222936] dark:bg-[#121722]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#09111f] dark:text-[#f4f6f8]">
                Tema
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#667080] dark:text-[#aab2bf]">
                Modo actual:{" "}
                <span suppressHydrationWarning>
                  {isDark ? "oscuro" : "claro"}
                </span>
              </p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#ece7e3] bg-[#f7f4f1] text-[#4e5968] dark:border-[#2b3342] dark:bg-[#1a202b] ">
              {isDark ? (
                <Moon className="size-5" />
              ) : (
                <Sun className="size-5" />
              )}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              className={cn(
                "flex min-h-28 flex-col items-start justify-between rounded-2xl border p-4 text-left transition",
                theme === "light"
                  ? "border-[var(--portal-accent)] bg-[var(--portal-accent-soft)] text-[#5f4a08] shadow-[0_12px_30px_var(--portal-accent-shadow)]"
                  : "border-[#ece7e3] bg-[#fdfdfc] text-[#4e5968] dark:border-[#2b3342] dark:bg-[#0d1016] dark:text-[#aab2bf]",
              )}
              type="button"
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
            >
              <Sun className="size-6" />
              <span className="text-base font-black">Claro</span>
            </button>
            <button
              className={cn(
                "flex min-h-28 flex-col items-start justify-between rounded-2xl border p-4 text-left transition",
                theme === "dark"
                  ? "border-[var(--portal-accent)] bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] shadow-[0_12px_30px_var(--portal-accent-shadow)]"
                  : "border-[#ece7e3] bg-[#fdfdfc] text-[#4e5968] dark:border-[#2b3342] dark:bg-[#0d1016] dark:text-[#aab2bf]",
              )}
              type="button"
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
            >
              <Moon className="size-6" />
              <span className="text-base font-black">Oscuro</span>
            </button>
          </div>
        </section>
      </section>
    </ClientPortalShell>
  );
}

function PortalWeightSection({
  deletingId,
  error,
  formSaving,
  items,
  onDelete,
  onSave,
}: {
  deletingId: string | null;
  error: string | null;
  formSaving: boolean;
  items: ClientPortalWeightLog[];
  onDelete: (id: string) => Promise<boolean>;
  onSave: (
    input: { note?: string | null; recordedAt: string; weightKg: number },
    id?: string,
  ) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<ClientPortalWeightLog | null>(null);
  const [confirmDelete, setConfirmDelete] =
    useState<ClientPortalWeightLog | null>(null);
  const [weightKg, setWeightKg] = useState("");
  const [recordedAt, setRecordedAt] = useState(getLocalWeightDateInputValue());
  const [note, setNote] = useState("");
  const summary = buildWeightSummary(items);
  const hasPendingDelete = deletingId !== null;

  function resetForm() {
    setEditing(null);
    setWeightKg("");
    setRecordedAt(getLocalWeightDateInputValue());
    setNote("");
  }

  function startEdit(item: ClientPortalWeightLog) {
    setEditing(item);
    setWeightKg(item.weightKg.toString());
    setRecordedAt(item.recordedAt.slice(0, 10));
    setNote(item.note ?? "");
  }

  return (
    <div className="mt-5 space-y-6">
      <section
        aria-label="Resumen de peso"
        className="rounded-2xl border border-transparent bg-card p-4 shadow-[var(--surface-shadow-soft)] sm:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 sm:divide-x sm:divide-border/70">
          <div className="flex min-w-0 gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]">
              <Scale className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                Último peso
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {summary.latestWeightKg === null
                  ? "Sin registros"
                  : `${summary.latestWeightKg} kg`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.latestRecordedAt
                  ? `Último registro · ${formatWeightRecordedDate(summary.latestRecordedAt)}`
                  : "Sin fecha registrada"}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 gap-4 sm:pl-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <ListChecks className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Registros visibles
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {summary.visibleCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}

      <section aria-labelledby="weight-history-title" className="space-y-3">
        <h2
          id="weight-history-title"
          className="text-xl font-semibold text-foreground"
        >
          Historial de peso
        </h2>
        {items.length === 0 ? (
          <PortalEmpty text="Aun no hay registros de peso." />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const clientManaged = canClientManageWeightLog(item);
              const deleting = deletingId === item.id;

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--surface-shadow-soft)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]">
                        <Scale className="size-6" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-2xl font-semibold text-foreground">
                          {item.weightKg} kg
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatWeightRecordedDate(item.recordedAt)}
                        </p>
                        {item.note ? (
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/80">
                            {item.note}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                      <Badge
                        className="gap-1.5"
                        variant={clientManaged ? "success" : "info"}
                      >
                        {clientManaged ? (
                          <ShieldCheck className="size-3.5" aria-hidden="true" />
                        ) : (
                          <Info className="size-3.5" aria-hidden="true" />
                        )}
                        {clientManaged
                          ? "Registrado por ti"
                          : "Registrado por coach"}
                      </Badge>
                      {clientManaged ? (
                        <div className="flex w-full gap-2 sm:w-auto">
                          <Button
                            className="min-w-0 flex-1 sm:flex-none"
                            disabled={formSaving}
                            onClick={() => startEdit(item)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                            Editar
                          </Button>
                          <Button
                            aria-busy={deleting}
                            className="min-w-0 flex-1 border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none"
                            disabled={hasPendingDelete}
                            onClick={() => {
                              if (!hasPendingDelete) {
                                setConfirmDelete(item);
                              }
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {deleting ? (
                              <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Trash2 className="size-4" aria-hidden="true" />
                            )}
                            Borrar
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <form
        className="grid min-w-0 gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--surface-shadow-soft)] sm:grid-cols-2 sm:p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const saved = await onSave(
            {
              weightKg: Number(weightKg),
              recordedAt,
              note: note.trim() || null,
            },
            editing?.id,
          );
          if (saved) {
            resetForm();
          }
        }}
      >
        <div className="sm:col-span-2">
          <h2 className="text-xl font-semibold text-foreground">
            {editing ? "Editar peso" : "Registrar peso"}
          </h2>
        </div>
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="weight-kg">Kg</Label>
          <Input
            id="weight-kg"
            min="1"
            required
            step="0.1"
            type="number"
            value={weightKg}
            onChange={(event) => setWeightKg(event.target.value)}
          />
        </div>
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="weight-recorded-at">Fecha</Label>
          <Input
            id="weight-recorded-at"
            required
            type="date"
            value={recordedAt}
            onChange={(event) => setRecordedAt(event.target.value)}
          />
        </div>
        <div className="grid min-w-0 gap-2 sm:col-span-2">
          <Label htmlFor="weight-note">Nota</Label>
          <textarea
            id="weight-note"
            className="min-h-24 w-full resize-y rounded-xl border bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="¿Cómo te sentiste?"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          {editing ? (
            <Button
              disabled={formSaving}
              type="button"
              variant="outline"
              onClick={resetForm}
            >
              Cancelar
            </Button>
          ) : null}
          <Button aria-busy={formSaving} disabled={formSaving} type="submit">
            {formSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {editing ? "Guardar cambios" : "Registrar"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDelete(null);
          }
        }}
        title="¿Borrar registro de peso?"
        description="Este registro se eliminará del historial de peso."
        cancelLabel="Cancelar"
        confirmLabel="Borrar"
        isLoading={confirmDelete ? deletingId === confirmDelete.id : false}
        onConfirm={async () => {
          if (!confirmDelete || deletingId !== null) return;
          await onDelete(confirmDelete.id);
        }}
      />
    </div>
  );
}

function PortalMeasurementsSection({
  items,
}: {
  items: ClientPortalBodyMeasurement[];
}) {
  return (
    <div className="mt-5 space-y-3">
      {items.length === 0 ? (
        <PortalEmpty text="No hay medidas visibles por ahora." />
      ) : (
        items.map((item) => (
          <PortalRecord
            key={item.id}
            title={portalMeasurementSummary(item)}
            meta={portalFormatDate(item.recordedAt)}
            note={item.note}
          />
        ))
      )}
    </div>
  );
}

function PortalPhotosSection({
  error,
  items,
  onDelete,
  onUpload,
  saving,
}: {
  error: string | null;
  items: ClientPortalProgressPhoto[];
  onDelete: (id: string) => Promise<void>;
  onUpload: (formData: FormData) => Promise<void>;
  saving: boolean;
}) {
  const [photoType, setPhotoType] =
    useState<ClientPortalProgressPhotoType>("front");
  const [recordedAt, setRecordedAt] = useState(portalDateInput());
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="mt-5 space-y-4">
      {error ? (
        <p className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}
      <form
        className="grid gap-3 rounded-2xl border border-[#ece7e3] bg-white p-4 shadow-sm dark:border-[#222936] dark:bg-[#121722] sm:grid-cols-[1fr_1fr_2fr_auto]"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!file) return;
          const formData = new FormData();
          formData.append("photoType", photoType);
          formData.append("recordedAt", recordedAt);
          formData.append("photo", file);
          await onUpload(formData);
          setFile(null);
        }}
      >
        <PortalSelect
          label="Tipo"
          value={photoType}
          options={portalPhotoLabels}
          onChange={(value) =>
            setPhotoType(value as ClientPortalProgressPhotoType)
          }
        />
        <PortalInput
          label="Fecha"
          type="date"
          value={recordedAt}
          onChange={setRecordedAt}
        />
        <label className="grid min-w-0 gap-1 text-sm font-bold text-[#121722] dark:text-[#f4f6f8]">
          Foto
          <input
            accept="image/jpeg,image/png,image/webp"
            className="w-full min-w-0 overflow-hidden rounded-xl border border-[#e4dfda] bg-white px-3 py-2 text-sm text-[#121722] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--portal-accent-soft)] file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-[var(--portal-accent)] dark:border-[#2b3342] dark:bg-[#0d1016] dark:text-[#f4f6f8] dark:file:bg-[#1f2937] "
            required
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <PortalButton
          className="w-full sm:self-end"
          disabled={saving || !file}
          type="submit"
        >
          Subir
        </PortalButton>
      </form>
      {items.length === 0 ? (
        <PortalEmpty text="Aun no hay fotos de progreso." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-[#ece7e3] bg-white shadow-sm dark:border-[#222936] dark:bg-[#121722]"
            >
              <div className="relative aspect-[4/3] w-full">
                <NextImage
                  alt={`Foto ${portalPhotoLabels[item.photoType]}`}
                  className="object-cover"
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  src={item.signedUrl}
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-4 text-sm font-bold">
                <span>
                  {portalPhotoLabels[item.photoType]} /{" "}
                  {portalFormatDate(item.recordedAt)}
                </span>
                {item.uploadedByType === "client" ? (
                  <PortalButton
                    disabled={saving}
                    type="button"
                    variant="danger"
                    onClick={() => void onDelete(item.id)}
                  >
                    Borrar
                  </PortalButton>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PortalNotesSection({ items }: { items: ClientPortalProgressNote[] }) {
  return (
    <div className="mt-5 space-y-3">
      {items.length === 0 ? (
        <PortalEmpty text="No hay notas visibles por ahora." />
      ) : (
        items.map((item) => (
          <PortalRecord
            key={item.id}
            title="Nota de tu coach"
            meta={portalFormatDate(item.createdAt)}
            note={item.text}
          />
        ))
      )}
    </div>
  );
}

function PortalRecord({
  children,
  meta,
  note,
  title,
}: {
  children?: ReactNode;
  meta: string;
  note?: string | null;
  title: string;
}) {
  return (
    <article className="rounded-2xl border border-[#ece7e3] bg-white p-4 shadow-sm dark:border-[#222936] dark:bg-[#121722]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-black">{title}</h2>
          <p className="mt-1 text-xs font-bold text-[#667080] dark:text-[#aab2bf]">
            {meta}
          </p>
          {note ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4a5565] dark:text-[#d6dbe3]">
              {note}
            </p>
          ) : null}
        </div>
        {children ? (
          <div className="flex shrink-0 gap-2">{children}</div>
        ) : null}
      </div>
    </article>
  );
}

function PortalInput({
  label,
  onChange,
  value,
  ...props
}: { label: string; onChange: (value: string) => void; value: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
>) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-bold text-[#121722] dark:text-[#f4f6f8]">
      {label}
      <input
        className="w-full min-w-0 rounded-xl border border-[#e4dfda] bg-white px-3 py-2 text-sm text-[#121722] dark:border-[#2b3342] dark:bg-[#0d1016] dark:text-[#f4f6f8]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}

function PortalSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-bold text-[#121722] dark:text-[#f4f6f8]">
      {label}
      <select
        className="w-full min-w-0 rounded-xl border border-[#e4dfda] bg-white px-3 py-2 text-sm text-[#121722] dark:border-[#2b3342] dark:bg-[#0d1016] dark:text-[#f4f6f8]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {Object.entries(options).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PortalButton({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-black disabled:opacity-60",
        variant === "primary" &&
          "bg-[var(--portal-accent)] text-[var(--portal-accent-on)] dark:text-[#0b0d0f]",
        variant === "secondary" &&
          "border border-[#e4dfda] bg-white text-[#121722] dark:border-[#2b3342] dark:bg-[#0d1016] dark:text-[#f4f6f8]",
        variant === "danger" &&
          "bg-[var(--portal-accent-soft)] text-[#b63d31] dark:bg-[#3a1515] dark:text-[#ffb4aa]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function PortalEmpty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-[#e4dfda] bg-white p-5 text-center text-sm font-bold text-[#667080] dark:border-[#2b3342] dark:bg-[#121722] dark:text-[#aab2bf]">
      {text}
    </p>
  );
}

function portalDateInput(value?: string) {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function portalFormatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function portalMeasurementSummary(item: ClientPortalBodyMeasurement) {
  const parts = portalMeasurementFields
    .map(([key, label]) => (item[key] ? `${label} ${item[key]} cm` : null))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "Medidas";
}

function isForbidden(caught: unknown) {
  return (
    typeof caught === "object" &&
    caught !== null &&
    "status" in caught &&
    caught.status === 403
  );
}

function mobileCalendarDayId(date: string) {
  return `mobile-calendar-day-${date}`;
}

function MobileCalendarWeekStrip({
  days,
  onSelect,
  selectedDate,
}: {
  days: ClientPortalDay[];
  onSelect: (date: string) => void;
  selectedDate: string;
}) {
  return (
    <div
      aria-label="Días de la semana"
      className="mt-4 grid snap-x grid-cols-[repeat(7,minmax(44px,1fr))] gap-1 overflow-x-auto rounded-2xl border border-transparent bg-card p-1.5 shadow-[var(--surface-shadow-soft)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
    >
      {days.map((day) => {
        const selected = day.date === selectedDate;
        return (
          <button
            aria-label={`${longDay(day.dayOfWeek)} ${Number(day.date.slice(-2))}: ${statusLabels[day.status]}`}
            aria-pressed={selected}
            className={cn(
              "flex min-h-[5.75rem] min-w-11 snap-start flex-col items-center rounded-xl px-1 py-2 text-center transition-[background,color,box-shadow] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              selected
                ? "bg-primary text-primary-foreground shadow-[0_10px_24px_color-mix(in_oklab,var(--primary)_20%,transparent)]"
                : "text-foreground hover:bg-accent/60",
            )}
            id={mobileCalendarDayId(day.date)}
            key={day.date}
            onClick={() => onSelect(day.date)}
            type="button"
          >
            <span
              className={cn(
                "text-[0.65rem] font-semibold uppercase leading-none",
                selected
                  ? "text-primary-foreground/90"
                  : "text-muted-foreground",
              )}
            >
              {shortDay(day.dayOfWeek)}
            </span>
            <span className="mt-1 text-xl font-semibold leading-none tracking-normal">
              {Number(day.date.slice(-2))}
            </span>
            <MobileCalendarStatusMark day={day} selected={selected} />
          </button>
        );
      })}
    </div>
  );
}

function MobileCalendarStatusMark({
  className,
  day,
  selected = false,
}: {
  className?: string;
  day: ClientPortalDay;
  selected?: boolean;
}) {
  const tone = calendarDayTone(day);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-2 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
        selected
          ? "border-primary-foreground/80 bg-primary-foreground/15 text-primary-foreground"
          : mobileCalendarStatusToneClasses[tone],
        className,
      )}
    >
      {!day.session ? (
        <span className="text-base font-bold leading-none">−</span>
      ) : day.status === "completed" ||
        day.status === "partially_completed" ? (
        <Check className="size-3.5" />
      ) : day.status === "overdue" ? (
        <AlertTriangle className="size-3.5" />
      ) : day.status === "opened" || day.status === "in_progress" ? (
        <ChevronRight className="size-3.5" />
      ) : null}
    </span>
  );
}

function MobileSelectedSessionCard({
  day,
  loading,
  onOpen,
  progress,
}: {
  day: ClientPortalDay;
  loading: boolean;
  onOpen: () => void;
  progress: CalendarProgress | null;
}) {
  return (
    <article className="mt-4 rounded-2xl border border-transparent bg-card p-4 shadow-[var(--surface-shadow-soft)]">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary"
        >
          {day.session ? (
            <Dumbbell className="size-5" />
          ) : (
            <Calendar className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            {formatFullDate(day.date, day.dayOfWeek)}
          </p>
          <h2 className="mt-1 text-lg font-bold leading-tight tracking-normal text-foreground">
            {day.session?.name ?? "Día de recuperación"}
          </h2>
        </div>
        <MobileCalendarStatusBadge day={day} className="shrink-0" />
      </div>

      {day.session?.description ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {day.session.description}
        </p>
      ) : !day.session ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          No tienes entrenamiento programado para este día.
        </p>
      ) : null}

      {day.log && progress ? (
        <div className="mt-5 border-t border-border pt-5">
          <p className="text-sm font-semibold text-muted-foreground">
            Tu progreso
          </p>
          <div className="mt-3 flex items-center gap-4">
            <div
              aria-label={`${progress.percentage}% completado`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress.percentage}
              className="relative size-20 shrink-0"
              role="progressbar"
            >
              <svg
                aria-hidden="true"
                className="size-full -rotate-90"
                viewBox="0 0 40 40"
              >
                <circle
                  className="fill-none stroke-muted"
                  cx="20"
                  cy="20"
                  pathLength="100"
                  r="16"
                  strokeWidth="3"
                />
                <circle
                  className="fill-none stroke-primary"
                  cx="20"
                  cy="20"
                  pathLength="100"
                  r="16"
                  strokeDasharray={`${progress.percentage} 100`}
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-primary">
                {progress.percentage}%
              </span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground">
                {progress.completed} / {progress.total} ejercicios
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Completados
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {day.session ? (
        <Button
          aria-busy={loading}
          className="mt-5 min-h-12 w-full rounded-xl text-sm font-semibold"
          disabled={loading}
          onClick={onOpen}
          type="button"
        >
          {loading ? (
            <>
              <Loader2 aria-hidden="true" className="size-5 animate-spin" />
              <span className="sr-only">Abriendo sesión</span>
            </>
          ) : (
            mobileCalendarDayActionLabel(day)
          )}
          {!loading ? <ChevronRight className="size-5" /> : null}
        </Button>
      ) : null}
    </article>
  );
}

function MobileUpcomingDays({
  days,
  onSelect,
}: {
  days: ClientPortalDay[];
  onSelect: (date: string) => void;
}) {
  if (!days.length) return null;

  return (
    <section className="mt-7" aria-labelledby="mobile-upcoming-title">
      <h2
        className="text-base font-bold tracking-normal text-foreground"
        id="mobile-upcoming-title"
      >
        Próximas sesiones
      </h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-transparent bg-card shadow-[var(--surface-shadow-soft)]">
        {days.map((day) => {
          const tone = calendarDayTone(day);
          return (
            <button
              aria-label={`Seleccionar ${longDay(day.dayOfWeek)} ${Number(day.date.slice(-2))}: ${day.session?.name ?? "Descanso"}, ${statusLabels[day.status]}`}
              className={cn(
                "grid min-h-16 w-full grid-cols-[2.4rem_1.75rem_minmax(0,1fr)_auto_1rem] items-center gap-2 border-b border-border/70 px-3 py-3 text-left last:border-b-0 hover:bg-accent/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
                tone === "rest" && "text-muted-foreground",
              )}
              key={day.date}
              onClick={() => onSelect(day.date)}
              type="button"
            >
              <span className="text-center">
                <span className="block text-[0.65rem] font-medium text-muted-foreground">
                  {shortDay(day.dayOfWeek)}
                </span>
                <span
                  className={cn(
                    "block text-base font-semibold",
                    tone === "rest" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {Number(day.date.slice(-2))}
                </span>
              </span>
              <MobileCalendarStatusMark className="mt-0" day={day} />
              <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                {day.session?.name ?? "Descanso"}
              </span>
              <MobileCalendarStatusBadge
                day={day}
                className="max-w-[5.5rem] truncate px-2 text-[0.65rem]"
              />
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CalendarDayCard({
  day,
  loading,
  onOpen,
}: {
  day: ClientPortalDay;
  loading: boolean;
  onOpen: () => void;
}) {
  const tone = calendarDayTone(day);
  return (
    <div className="rounded-xl border border-[#ece7e3] bg-white shadow-sm dark:border-[#293140] dark:bg-[#121722]">
      <button
        className="flex min-h-20 w-full items-center justify-between p-4 text-left disabled:opacity-70"
        disabled={loading || !day.session}
        onClick={onOpen}
        type="button"
      >
        <div>
          <p className="text-sm font-medium text-[#8b929d] dark:text-[#c7cfdb]">
            {longDay(day.dayOfWeek)} {day.date.slice(-2)}
          </p>
          <h3 className="mt-2 text-base font-bold text-[#09111f] dark:text-[#f4f6f8]">
            {day.session?.name ?? "Descanso"}
          </h3>
          <CalendarStatusBadge day={day} className="mt-2" />
        </div>
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-full border",
            calendarIconToneClasses[tone],
          )}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isFinalized(day.status) ? (
            <Check className="size-5" />
          ) : day.session ? (
            <ChevronRight className="size-5" />
          ) : null}
        </div>
      </button>
    </div>
  );
}

function CalendarWeekCell({
  day,
  selected,
  onSelect,
}: {
  day: ClientPortalDay;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = calendarDayTone(day);

  return (
    <button
      className={cn(
        "flex min-h-40 flex-col items-center rounded-xl border p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        calendarCellToneClasses[tone],
        selected &&
          "border-[var(--portal-accent)] bg-[#fff8f6] shadow-[0_12px_28px_var(--portal-accent-shadow)] dark:bg-[var(--portal-accent-soft)]",
      )}
      onClick={onSelect}
      type="button"
    >
      <p
        className={cn(
          "text-sm font-bold text-[#667080] dark:text-[#c7cfdb]",
          selected && "text-[var(--portal-accent)]",
        )}
      >
        {shortDay(day.dayOfWeek)}
      </p>
      <p
        className={cn(
          "mt-2 text-3xl font-bold text-[#09111f] dark:text-[#f4f6f8]",
          selected && "text-[var(--portal-accent)]",
        )}
      >
        {day.date.slice(-2)}
      </p>
      <div
        className={cn(
          "mt-4 flex size-9 items-center justify-center rounded-full border",
          calendarIconToneClasses[tone],
        )}
      >
        <CalendarStatusIcon day={day} />
      </div>
      <span
        className={cn(
          "mt-3 max-w-full truncate text-xs font-bold",
          calendarLabelToneClasses[tone],
        )}
      >
        {calendarDayShortLabel(day)}
      </span>
    </button>
  );
}

function CalendarLegend() {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium text-[#667080] dark:text-[#c7cfdb]">
      <span className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-[var(--portal-accent)] text-[var(--portal-accent-on)]">
          <Check className="size-3" />
        </span>
        Completada
      </span>
      <span className="flex items-center gap-2">
        <span className="size-4 rounded-full border-2 border-[var(--portal-accent)]" />
        Pendiente
      </span>
      <span className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-[var(--portal-accent)] text-[var(--portal-accent-on)]">
          <AlertTriangle className="size-3" />
        </span>
        Atrasada
      </span>
      <span className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-[var(--portal-accent)] text-[var(--portal-accent-on)]">
          <ChevronRight className="size-3" />
        </span>
        En curso
      </span>
      <span className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-[#d8a21b] text-white">
          <Check className="size-3" />
        </span>
        Parcial
      </span>
      <span className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full border border-[#d8d1ca] bg-white text-[#667080] dark:border-[#5f6a7b] dark:bg-[#121722] dark:text-[#d6dbe3]">
          <RotateCcw className="size-3" />
        </span>
        Descanso
      </span>
    </div>
  );
}

function SelectedSessionCard({
  day,
  loading,
  onOpen,
}: {
  day: ClientPortalDay;
  loading: boolean;
  onOpen: () => void;
}) {
  const tone = calendarDayTone(day);

  return (
    <article className="mt-5 grid gap-6 rounded-xl border border-[#ece7e3] bg-white p-6 shadow-sm dark:border-[#293140] dark:bg-[#121722] xl:grid-cols-[1fr_auto] xl:gap-8">
      <div className="flex min-w-0 gap-5">
        <div
          className={cn(
            "flex size-20 shrink-0 items-center justify-center rounded-2xl border",
            calendarCellToneClasses[tone],
          )}
        >
          <Calendar className={cn("size-9", calendarLabelToneClasses[tone])} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#667080] dark:text-[#c7cfdb]">
            {formatFullDate(day.date, day.dayOfWeek)}
          </p>
          <h2 className="mt-2 truncate text-2xl font-bold text-[#09111f] dark:text-[#f4f6f8]">
            {day.session?.name ?? "Descanso"}
          </h2>
          <CalendarStatusBadge day={day} className="mt-3" />
        </div>
      </div>
      {day.session ? (
        <div className="flex min-w-0 items-center border-t border-[#ece7e3] pt-6 dark:border-[#293140] xl:min-w-64 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
          <button
            aria-busy={loading}
            className={cn(
              "flex h-14 w-full items-center justify-center gap-3 rounded-xl px-5 text-base font-bold",
              calendarButtonToneClasses[tone],
            )}
            disabled={loading}
            onClick={onOpen}
            type="button"
          >
            {loading ? (
              <>
                <Loader2 aria-hidden="true" className="size-5 animate-spin" />
                <span className="sr-only">Abriendo sesión</span>
              </>
            ) : (
              calendarDayActionLabel(day)
            )}
            {!loading ? <ChevronRight className="size-5" /> : null}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function UpcomingDays({ days }: { days: ClientPortalDay[] }) {
  if (!days.length) return null;

  return (
    <section className="mt-7">
      <h2 className="text-xl font-bold text-[#09111f] dark:text-[#f4f6f8]">Proximos dias</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-[#ece7e3] bg-white shadow-sm dark:border-[#293140] dark:bg-[#121722]">
        {days.map((day) => (
          <div
            className="grid grid-cols-[4rem_1fr_auto] items-center gap-4 border-b border-[#ece7e3] px-4 py-4 last:border-b-0 dark:border-[#293140]"
            key={day.date}
          >
            <div className="rounded-xl bg-[#f4f1ef] px-3 py-2 text-center dark:bg-[#1a202b]">
              <p className="text-xs font-bold text-[#667080] dark:text-[#c7cfdb]">
                {shortDay(day.dayOfWeek)}
              </p>
              <p className="text-lg font-bold text-[#09111f] dark:text-[#f4f6f8]">
                {day.date.slice(-2)}
              </p>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-[#09111f] dark:text-[#f4f6f8]">
                {day.session?.name ?? "Descanso"}
              </h3>
              <p className="mt-1 text-sm font-medium text-[#667080] dark:text-[#c7cfdb]">
                {day.session
                  ? "Próxima sesión programada."
                  : "Día de recuperación."}
              </p>
            </div>
            <CalendarStatusBadge day={day} />
          </div>
        ))}
      </div>
    </section>
  );
}

function SessionProgressPanel({
  completedCount,
  finalizing,
  onFinalize,
  onSave,
  pendingCount,
  readOnly = false,
  total,
}: {
  completedCount: number;
  finalizing: boolean;
  onFinalize: () => void;
  onSave: () => void;
  pendingCount: number;
  readOnly?: boolean;
  total: number;
}) {
  const progress = total ? (completedCount / total) * 100 : 0;

  return (
    <aside className="hidden lg:sticky lg:top-8 lg:block">
      <div className="rounded-xl border border-[#ece7e3] bg-white p-5 shadow-sm dark:border-[#293140] dark:bg-[#121722]">
        <p className="text-sm font-bold text-[#667080] dark:text-[#c7cfdb]">Progreso actual</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-[#09111f] dark:text-[#f4f6f8]">
              {completedCount}/{total}
            </p>
            <p className="mt-1 text-sm font-medium text-[#667080] dark:text-[#c7cfdb]">
              ejercicios completados
            </p>
          </div>
          <span className="rounded-full bg-[var(--portal-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--portal-accent)]">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="mt-5 h-2 rounded-full bg-[#f0eeee] dark:bg-[#242b36]">
          <div
            className="h-2 rounded-full bg-[var(--portal-accent)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-4 text-sm font-medium text-[#667080] dark:text-[#c7cfdb]">
          {readOnly
            ? "Vista previa de la sesion programada."
            : pendingCount > 0
              ? `${pendingCount} ejercicios pendientes.`
              : "Todos los ejercicios estan listos para finalizar."}
        </p>
        <div className="mt-6 space-y-3">
          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--portal-accent)] text-sm font-bold text-[var(--portal-accent)]"
            onClick={onSave}
            type="button"
          >
            <Home className="size-4" /> Guardar y salir
          </button>
          <button
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-[0_10px_24px_var(--portal-accent-shadow)] disabled:opacity-60",
              readOnly
                ? "bg-[#ece7e3] text-[#667080] shadow-none dark:bg-[#242b36] dark:text-[#c7cfdb]"
                : "bg-[var(--portal-accent)] text-[var(--portal-accent-on)]",
            )}
            disabled={finalizing || readOnly}
            onClick={onFinalize}
            type="button"
          >
            {readOnly ? (
              "Disponible en la fecha programada"
            ) : finalizing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            {readOnly ? null : "Finalizar sesion"}
          </button>
        </div>
      </div>
    </aside>
  );
}

type ClientSessionExercise =
  ClientSessionLog["snapshotData"]["exercises"][number];

function SessionExerciseListCard({
  exercise,
  index,
  completed,
  loading,
  readOnly = false,
  onComplete,
  onOpen,
}: {
  exercise: ClientSessionExercise;
  index: number;
  completed: boolean;
  loading: boolean;
  readOnly?: boolean;
  onComplete: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="flex min-h-24 items-center gap-4 rounded-xl border border-[#d8d1ca] bg-white p-4 shadow-sm transition hover:border-[#c9cdd3] dark:border-[#293140] dark:bg-[#121722] dark:hover:border-[#3a4354]">
      <button
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
        onClick={onOpen}
        type="button"
      >
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            completed
              ? "bg-[var(--portal-accent)] text-[var(--portal-accent-on)]"
              : "bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]",
          )}
        >
          {completed ? <Check className="size-4" /> : index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-extrabold text-[#09111f] dark:text-[#f4f6f8]">
            {exercise.exercise.name}
          </h3>
          <p className="mt-2 text-sm font-bold text-[#667080] dark:text-[#c7cfdb]">
            {exercise.sets ?? "-"} series x {exercise.reps} reps
          </p>
          <p className="mt-1 text-sm font-bold text-[#667080] dark:text-[#c7cfdb]">
            {exercise.restSeconds ?? "-"} seg descanso
          </p>
        </div>
      </button>
      {readOnly ? (
        <div className="rounded-lg bg-[#f4f1ef] px-3 py-2 text-xs font-bold text-[#667080] dark:bg-[#242b36] dark:text-[#c7cfdb]">
          Lectura
        </div>
      ) : (
        <button
          aria-label="Completar ejercicio"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full border border-[#8b929d] bg-white text-[#09111f] dark:border-[#5f6a7b] dark:bg-[#0d1016] dark:text-[#f4f6f8]",
            completed &&
              "border-[var(--portal-accent)] bg-[var(--portal-accent)] text-[var(--portal-accent-on)]",
          )}
          disabled={completed || loading}
          onClick={onComplete}
          type="button"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : completed ? (
            <Check className="size-5" />
          ) : null}
        </button>
      )}
    </article>
  );
}

function ClientExerciseDetailView({
  exercise,
  index,
  total,
  completed,
  completedCount,
  loading,
  readOnly,
  selectedAlternativeId,
  onBack,
  onNext,
  onPrevious,
  onComplete,
  onUseAlternative,
  onSave,
  onFinalize,
}: {
  exercise: ClientSessionExercise;
  index: number;
  total: number;
  completed: boolean;
  completedCount: number;
  loading: boolean;
  readOnly: boolean;
  selectedAlternativeId: string | null;
  onBack: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
  onUseAlternative: (alternativeId: string) => void;
  onSave: () => void;
  onFinalize: () => void;
}) {
  const progress = total ? (completedCount / total) * 100 : 0;
  const selectedAlternative = exercise.alternatives.find(
    (alternative) => alternative.id === selectedAlternativeId,
  );
  const suggestedAlternative =
    selectedAlternative ?? exercise.alternatives[0] ?? null;

  return (
    <article>
      <div className="flex items-center justify-between gap-3">
        <button
          aria-label="Volver"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#ece7e3] bg-white text-[#09111f] shadow-sm dark:border-[#293140] dark:bg-[#121722] dark:text-[#f4f6f8]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-base font-extrabold text-[#09111f] dark:text-[#f4f6f8]">
            Detalle del ejercicio
          </p>
          <p className="mt-1 text-xs font-bold text-[#8b929d] dark:text-[#c7cfdb]">
            Sesion cliente
          </p>
        </div>
        <div className="size-11 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between gap-4 text-sm font-bold">
          <span className="text-[#09111f] dark:text-[#f4f6f8]">
            Ejercicio {index + 1} de {total}
          </span>
          <span className="text-[#4e5968] dark:text-[#c7cfdb]">
            {Math.round(progress)}% completado
          </span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-[#eceff2] dark:bg-[#242b36]">
          <div
            className="h-2 rounded-full bg-[var(--portal-accent)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between gap-4">
        <h1 className="min-w-0 text-4xl font-black leading-tight tracking-normal text-[#09111f] dark:text-[#f4f6f8] md:text-5xl">
          {exercise.exercise.name}
        </h1>
      </div>

      <ExerciseMediaHero exercise={exercise.exercise} />
      <ExerciseMetricGrid exercise={exercise} />

      <div className="mt-6 space-y-4">
        <ExerciseInfoCard
          icon={<Info className="size-5" />}
          title="Indicaciones"
          value={
            exercise.exercise.instructions ?? "Sin indicaciones registradas."
          }
        />
        {exercise.coachNote ? (
          <ExerciseInfoCard
            icon={<Star className="size-5" />}
            title="Nota del coach"
            value={exercise.coachNote}
          />
        ) : (
          <ExerciseInfoCard
            muted
            icon={<Star className="size-5" />}
            title="Nota del coach"
            value="Sin nota del coach."
          />
        )}
        {suggestedAlternative ? (
          <AlternativeSuggestion
            alternative={suggestedAlternative}
            exercise={exercise}
            loading={loading}
            readOnly={readOnly}
            selectedAlternativeId={selectedAlternativeId}
            onUseAlternative={onUseAlternative}
          />
        ) : null}
      </div>

      <div className="mt-6 hidden items-center justify-between gap-3 lg:flex">
        <button
          className="flex h-11 items-center gap-2 rounded-xl border border-[#ece7e3] bg-white px-4 text-sm font-bold text-[#4e5968] disabled:opacity-50 dark:border-[#293140] dark:bg-[#121722] dark:text-[#c7cfdb]"
          disabled={index === 0}
          onClick={onPrevious}
          type="button"
        >
          <ChevronLeft className="size-4" /> Anterior
        </button>
        <button
          className="flex h-11 items-center gap-2 rounded-xl border border-[#ece7e3] bg-white px-4 text-sm font-bold text-[#4e5968] disabled:opacity-50 dark:border-[#293140] dark:bg-[#121722] dark:text-[#c7cfdb]"
          disabled={index >= total - 1}
          onClick={onNext}
          type="button"
        >
          Siguiente <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="sticky bottom-0 -mx-5 mt-6 border-t border-[#ece7e3] bg-white/95 px-5 py-4 backdrop-blur dark:border-[#293140] dark:bg-[#0d1016]/95 lg:hidden">
        {readOnly ? (
          <button
            className="flex h-14 w-full items-center justify-center rounded-xl bg-[#ece7e3] text-sm font-bold text-[#667080] dark:bg-[#242b36] dark:text-[#c7cfdb]"
            disabled
            type="button"
          >
            Disponible en la fecha programada
          </button>
        ) : completed ? (
          <button
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#121722] text-sm font-bold text-white disabled:opacity-60"
            disabled={index >= total - 1}
            onClick={onNext}
            type="button"
          >
            <Check className="size-5" />{" "}
            {index >= total - 1 ? "Completado" : "Siguiente"}
          </button>
        ) : (
          <button
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[var(--portal-accent)] text-sm font-bold text-[var(--portal-accent-on)] shadow-[0_10px_24px_var(--portal-accent-shadow)] disabled:opacity-60"
            disabled={loading}
            onClick={onComplete}
            type="button"
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Check className="size-5" />
            )}{" "}
            Marcar completado
          </button>
        )}
        {!readOnly ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#ece7e3] text-xs font-bold text-[#4e5968] dark:border-[#3a4354] dark:text-[#c7cfdb]"
              onClick={onSave}
              type="button"
            >
              <Home className="size-4" /> Guardar y salir
            </button>
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#f1c7bd] text-xs font-bold text-[var(--portal-accent)]"
              onClick={onFinalize}
              type="button"
            >
              <RotateCcw className="size-4" /> Finalizar sesion
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ExerciseMediaHero({
  exercise,
}: {
  exercise: ClientSessionExercise["exercise"];
}) {
  const [isImageOpen, setIsImageOpen] = useState(false);

  if (!exercise.mediaUrl && !exercise.videoUrl) {
    return (
      <div className="mt-5 flex aspect-[16/10] min-h-56 items-center justify-center rounded-2xl border border-dashed border-[#d8d1ca] bg-[#f7f4f1] text-center dark:border-[#3a4354] dark:bg-[#121722]">
        <div>
          <FileText className="mx-auto size-8 text-[#8b929d] dark:text-[#c7cfdb]" />
          <p className="mt-3 text-sm font-bold text-[#4e5968] dark:text-[#c7cfdb]">
            Sin demostracion adjunta
          </p>
        </div>
      </div>
    );
  }

  if (!exercise.mediaUrl && exercise.videoUrl) {
    return (
      <div className="mt-5 flex aspect-[16/10] min-h-56 items-center justify-center rounded-2xl border border-[#ece7e3] bg-[#121722] p-5 text-white shadow-sm">
        <a
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-[#09111f] dark:bg-[#f4f6f8] dark:text-[#09111f]"
          href={exercise.videoUrl}
          rel="noreferrer"
          target="_blank"
        >
          <PlayCircle className="size-5 text-[var(--portal-accent)]" /> Ver
          demostracion
        </a>
      </div>
    );
  }

  if (!exercise.mediaUrl) {
    return null;
  }

  const imageUrl = exercise.mediaUrl;

  return (
    <div className="mt-5">
      <button
        className="relative block aspect-[16/10] min-h-56 w-full overflow-hidden rounded-2xl border border-[#ece7e3] bg-[#f4f1ef] shadow-sm dark:border-[#293140] dark:bg-[#121722]"
        type="button"
        aria-label={`Ampliar imagen de ${exercise.name}`}
        onClick={() => setIsImageOpen(true)}
      >
        <NextImage
          alt={`Demostracion de ${exercise.name}`}
          className="size-full object-cover"
          fill
          sizes="(max-width: 640px) 100vw, 560px"
          src={imageUrl}
          unoptimized
        />
      </button>
      {exercise.videoUrl ? (
        <a
          className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl border border-[#c9cdd3] bg-white px-4 text-sm font-extrabold text-[#09111f] dark:border-[#3a4354] dark:bg-[#121722] dark:text-[#f4f6f8]"
          href={exercise.videoUrl}
          rel="noreferrer"
          target="_blank"
        >
          <PlayCircle className="size-5 text-[var(--portal-accent)]" /> Ver
          video
        </a>
      ) : null}
      {isImageOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#09111f]/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen completa de ${exercise.name}`}
          onClick={() => setIsImageOpen(false)}
        >
          <button
            className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full bg-white text-[#09111f] shadow-lg dark:bg-[#f4f6f8]"
            type="button"
            aria-label="Cerrar imagen"
            onClick={(event) => {
              event.stopPropagation();
              setIsImageOpen(false);
            }}
          >
            <X className="size-5" />
          </button>
          <div
            className="relative h-[calc(100dvh-7rem)] w-full max-w-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <NextImage
              alt={`Demostracion de ${exercise.name}`}
              className="object-contain"
              fill
              sizes="100vw"
              src={imageUrl}
              unoptimized
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExerciseMetricGrid({ exercise }: { exercise: ClientSessionExercise }) {
  const metrics = [
    {
      label: "Musculo trabajado",
      value: exercise.exercise.primaryMuscle,
      icon: Dumbbell,
    },
    {
      label: "Series",
      value: exercise.sets ? `${exercise.sets} series` : "-",
      icon: Layers,
    },
    { label: "Repeticiones", value: exercise.reps, icon: RotateCcw },
    {
      label: "Descanso",
      value: exercise.restSeconds ? `${exercise.restSeconds} seg` : "-",
      icon: Clock,
    },
  ];

  return (
    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            className="min-h-28 rounded-xl border border-[#ece7e3] bg-white p-4 shadow-sm dark:border-[#293140] dark:bg-[#121722]"
            key={metric.label}
          >
            <Icon className="size-6 text-[var(--portal-accent)]" />
            <p className="mt-3 text-xs font-bold leading-4 text-[#667080] dark:text-[#c7cfdb]">
              {metric.label}
            </p>
            <p className="mt-1 text-base font-extrabold text-[#09111f] dark:text-[#f4f6f8]">
              {metric.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ExerciseInfoCard({
  icon,
  title,
  value,
  muted = false,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  muted?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="rounded-2xl border border-[#ece7e3] bg-white p-5 shadow-sm dark:border-[#293140] dark:bg-[#121722]">
      <button
        className="flex w-full items-center gap-3 text-left"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span className="text-[var(--portal-accent)]">{icon}</span>
        <h2 className="text-xl font-extrabold text-[#09111f] dark:text-[#f4f6f8]">{title}</h2>
        <ChevronDown
          className={cn(
            "ml-auto size-5 text-[#667080] transition dark:text-[#c7cfdb]",
            !expanded && "-rotate-90",
          )}
        />
      </button>
      {expanded ? (
        <p
          className={cn(
            "mt-3 whitespace-pre-line text-base leading-7",
            muted ? "text-[#8b929d] dark:text-[#8893a3]" : "text-[#4e5968] dark:text-[#d6dbe3]",
          )}
        >
          {value}
        </p>
      ) : null}
    </section>
  );
}

function AlternativeSuggestion({
  alternative,
  exercise,
  loading,
  readOnly,
  selectedAlternativeId,
  onUseAlternative,
}: {
  alternative: ClientSessionExercise["alternatives"][number];
  exercise: ClientSessionExercise;
  loading: boolean;
  readOnly: boolean;
  selectedAlternativeId: string | null;
  onUseAlternative: (alternativeId: string) => void;
}) {
  const isSelected = selectedAlternativeId === alternative.id;
  const [showDetails, setShowDetails] = useState(false);
  const canView = Boolean(
    alternative.exercise.mediaUrl ||
    alternative.exercise.videoUrl ||
    alternative.exercise.instructions,
  );

  return (
    <section className="rounded-2xl border border-[#ece7e3] bg-white p-5 shadow-sm dark:border-[#293140] dark:bg-[#121722]">
      <div className="flex items-center gap-3">
        <RotateCcw className="size-7 text-[var(--portal-accent)]" />
        <h2 className="text-xl font-extrabold text-[#09111f] dark:text-[#f4f6f8]">
          Alternativa sugerida
        </h2>
      </div>
      <div className="mt-4 grid grid-cols-[8rem_minmax(0,1fr)] gap-3 rounded-xl border border-[#ece7e3] bg-white p-3 shadow-[0_8px_22px_rgba(18,23,34,0.06)] dark:border-[#3a4354] dark:bg-[#0d1016] dark:shadow-none sm:grid-cols-[9.5rem_minmax(0,1fr)]">
        <AlternativeMediaPreview alternative={alternative} />
        <div className="min-w-0 rounded-xl border border-[#f0eeee] bg-white p-3 dark:border-[#293140] dark:bg-[#121722]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold leading-snug text-[#09111f] dark:text-[#f4f6f8]">
                {alternative.exercise.name}
              </h3>
              {alternative.note ? (
                <p className="mt-1 text-sm leading-6 text-[#667080] dark:text-[#c7cfdb]">
                  {alternative.note}
                </p>
              ) : null}
              <p className="mt-2 text-sm font-semibold text-[#667080] dark:text-[#c7cfdb]">
                {exercise.sets ?? "-"} series x {exercise.reps} reps ·{" "}
                {exercise.restSeconds ?? "-"} seg descanso
              </p>
            </div>
            {isSelected ? (
              <span className="shrink-0 rounded-full bg-[var(--portal-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--portal-accent)]">
                En uso
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {alternative.exercise.videoUrl ? (
              <a
                className="flex h-11 items-center justify-center rounded-xl border border-[#c9cdd3] text-sm font-extrabold text-[#09111f] shadow-sm dark:border-[#3a4354] dark:text-[#f4f6f8]"
                href={alternative.exercise.videoUrl}
                rel="noreferrer"
                target="_blank"
              >
                Ver video
              </a>
            ) : canView ? (
              <button
                className="flex h-11 items-center justify-center rounded-xl border border-[#c9cdd3] text-sm font-extrabold text-[#09111f] shadow-sm dark:border-[#3a4354] dark:text-[#f4f6f8]"
                onClick={() => setShowDetails((current) => !current)}
                type="button"
              >
                Ver alternativa
              </button>
            ) : null}
            {!readOnly ? (
              <button
                className="flex h-11 items-center justify-center rounded-xl border border-[var(--portal-accent)] text-sm font-extrabold text-[var(--portal-accent)] disabled:opacity-60"
                disabled={loading || isSelected}
                onClick={() => onUseAlternative(alternative.id)}
                type="button"
              >
                {isSelected ? "En uso" : "Usar alternativa"}
              </button>
            ) : null}
          </div>
          {showDetails && alternative.exercise.instructions ? (
            <p className="mt-4 whitespace-pre-line rounded-xl bg-[#f7f4f1] p-4 text-sm leading-6 text-[#4e5968] dark:bg-[#0d1016] dark:text-[#d6dbe3]">
              {alternative.exercise.instructions}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AlternativeMediaPreview({
  alternative,
}: {
  alternative: ClientSessionExercise["alternatives"][number];
}) {
  if (!alternative.exercise.mediaUrl && !alternative.exercise.videoUrl) {
    return (
      <div className="flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed border-[#d8d1ca] bg-[#f7f4f1] text-center dark:border-[#3a4354] dark:bg-[#0d1016]">
        <div className="px-3">
          <FileText className="mx-auto size-6 text-[#8b929d] dark:text-[#c7cfdb]" />
          <p className="mt-2 text-xs font-bold leading-5 text-[#667080] dark:text-[#c7cfdb]">
            Sin demostracion adjunta
          </p>
        </div>
      </div>
    );
  }

  if (!alternative.exercise.mediaUrl && alternative.exercise.videoUrl) {
    return (
      <a
        className="flex h-full min-h-32 items-center justify-center rounded-xl bg-[#121722] text-white"
        href={alternative.exercise.videoUrl}
        rel="noreferrer"
        target="_blank"
        aria-label={`Ver alternativa ${alternative.exercise.name}`}
      >
        <PlayCircle className="size-9 text-white" />
      </a>
    );
  }

  return (
    <div
      className="h-full min-h-32 rounded-xl bg-[#f4f1ef] bg-cover bg-center"
      role="img"
      aria-label={`Demostracion de ${alternative.exercise.name}`}
      style={{ backgroundImage: `url(${alternative.exercise.mediaUrl})` }}
    />
  );
}

function ExerciseMiniNavigation({
  activeIndex,
  completedIds,
  exercises,
  onSelect,
  readOnly = false,
}: {
  activeIndex: number;
  completedIds: string[];
  exercises: ClientSessionExercise[];
  onSelect: (index: number) => void;
  readOnly?: boolean;
}) {
  if (!exercises.length) return null;

  return (
    <nav
      className="mt-6 hidden rounded-xl border border-[#ece7e3] bg-white p-3 shadow-sm dark:border-[#293140] dark:bg-[#121722] lg:block"
      aria-label="Ejercicios de la sesion"
    >
      <p className="px-2 pb-2 text-xs font-bold uppercase text-[#8b929d] dark:text-[#c7cfdb]">
        {readOnly ? "Vista previa" : "Ejercicios"}
      </p>
      <div className="space-y-2">
        {exercises.map((exercise, itemIndex) => {
          const isActive = itemIndex === activeIndex;
          const isCompleted = completedIds.includes(exercise.sessionExerciseId);
          return (
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold",
                isActive
                  ? "bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]"
                  : "text-[#4e5968] hover:bg-[#f7f4f1] dark:text-[#c7cfdb] dark:hover:bg-[#1a202b]",
              )}
              key={exercise.sessionExerciseId}
              onClick={() => onSelect(itemIndex)}
              type="button"
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                  isCompleted
                    ? "bg-[var(--portal-accent)] text-[var(--portal-accent-on)]"
                    : "bg-[#eceff2] text-[#667080] dark:bg-[#242b36] dark:text-[#c7cfdb]",
                )}
              >
                {isCompleted ? <Check className="size-4" /> : itemIndex + 1}
              </span>
              <span className="truncate">{exercise.exercise.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function TopBar({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="flex items-center justify-between">
      <Link className="rounded-full p-2" href={backHref} aria-label="Volver">
        <ArrowLeft className="size-6" />
      </Link>
      <h1 className="max-w-[260px] truncate text-center text-lg font-bold">
        {title}
      </h1>
      <button
        className="rounded-full p-2"
        type="button"
        aria-label="Mas opciones"
      >
        <MoreHorizontal className="size-6" />
      </button>
    </header>
  );
}

function SessionBackLink({ href }: { href: string }) {
  return (
    <Link
      className="inline-flex size-11 items-center justify-center rounded-full border border-[#ece7e3] bg-white text-[#09111f] shadow-sm dark:border-[#293140] dark:bg-[#121722] dark:text-[#f4f6f8]"
      href={href}
      aria-label="Volver"
    >
      <ArrowLeft className="size-5" />
    </Link>
  );
}

function WeekButton({
  anchorDate,
  busy,
  disabled,
  direction,
  onNavigate,
}: {
  anchorDate: string;
  busy: boolean;
  disabled: boolean;
  direction: "prev" | "next";
  onNavigate: (direction: WeekNavigationDirection, anchorDate: string) => void;
}) {
  return (
    <Button
      aria-busy={busy}
      aria-label={direction === "prev" ? "Semana anterior" : "Semana siguiente"}
      className="size-10 rounded-xl border-border/70 bg-card shadow-[var(--surface-shadow-soft)]"
      disabled={disabled}
      onClick={() => onNavigate(direction, anchorDate)}
      size="icon"
      type="button"
      variant="outline"
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : direction === "prev" ? (
        <ChevronLeft className="size-4" />
      ) : (
        <ChevronRight className="size-4" />
      )}
    </Button>
  );
}

function EmptyCard({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#ece7e3] bg-white p-5 shadow-sm dark:border-[#222936] dark:bg-[#121722]",
        className,
      )}
    >
      <p className="text-base font-bold text-[#09111f] dark:text-[#f4f6f8]">
        {title}
      </p>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-[#667080] dark:text-[#aab2bf]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function ScreenState({
  title,
  description,
  compact,
}: {
  title: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "py-10" : "client-portal-viewport",
      )}
    >
      <Loader2 className="mb-4 size-8 animate-spin text-[var(--portal-accent)]" />
      <h1 className="text-xl font-bold">{title}</h1>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-[#667080]">{description}</p>
      ) : null}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-xl border border-[#f2c8c0] bg-[#fff4f1] p-3 text-sm font-semibold text-[#9f3529]">
      {message}
    </div>
  );
}

function BrandMark({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center text-[var(--portal-accent)]">
        <Dumbbell className="size-5 rotate-[-25deg]" />
      </div>
      {compact ? <span className="text-2xl font-bold">CoraFit</span> : null}
    </div>
  );
}

function calendarStateTitle(state?: ClientPortalCalendar["state"]) {
  if (state === "no_plan") return "Aun no tienes un plan asignado";
  if (state === "not_started") return "Tu plan aun no inicia";
  if (state === "plan_finished" || state === "outside_plan")
    return "Tu plan ya termino";
  return "Sin calendario disponible";
}

function longDay(day: string) {
  const labels: Record<string, string> = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miercoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sabado",
    sunday: "Domingo",
  };
  return labels[day] ?? day;
}

function shortDay(day: string) {
  return shortDayLabels[day] ?? day.slice(0, 3);
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function formatCalendarMonth(date: string) {
  return new Intl.DateTimeFormat("es-MX", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatCompletionDateParts(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return {
    dayMonth: parsed
      .toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
      .replace(".", ""),
    year: parsed.toLocaleDateString("es-MX", { year: "numeric" }),
  };
}

function buildCompletionCardSvg(data: CompletionCard, dark = false) {
  const sessionName = escapeSvgText(truncateText(data.sessionName, 34));
  const dateParts = formatCompletionDateParts(data.scheduledDate);
  const dateDayMonth = escapeSvgText(dateParts.dayMonth);
  const percentage = escapeSvgText(String(data.completionPercentage));
  const completed = escapeSvgText(String(data.completedExercises));
  const total = escapeSvgText(String(data.totalExercises));
  const streak = escapeSvgText(String(data.streak));
  const colors = dark
    ? {
        card: "#121722",
        cardStroke: "#2b3342",
        grid: "#0d1016",
        gridStroke: "#3a4354",
        accent: "#F0C947",
        accentSoft: "#2b2818",
        accentSofter: "#3a341d",
        text: "#f4f6f8",
        muted: "#c7cfdb",
        pillStroke: "#5d5124",
      }
    : {
        card: "#ffffff",
        cardStroke: "#f2ece7",
        grid: "#ffffff",
        gridStroke: "#ece7e3",
        accent: "#df4d3e",
        accentSoft: "#fff1ee",
        accentSofter: "#ffe1d9",
        text: "#071026",
        muted: "#667080",
        pillStroke: "#f4c8bd",
      };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1360" viewBox="0 0 1080 1360" role="img" aria-label="CoraFit sesion completada">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="30" stdDeviation="28" flood-color="#000000" flood-opacity="0.34"/></filter>
  </defs>
  <rect x="24" y="24" width="1032" height="1312" rx="86" fill="${colors.card}" stroke="${colors.cardStroke}" stroke-width="2" filter="url(#shadow)"/>
  <line x1="540" y1="80" x2="540" y2="155" stroke="${colors.accent}" stroke-width="2" opacity="0.65"/>
  <line x1="430" y1="125" x2="380" y2="75" stroke="${colors.accent}" stroke-width="2" opacity="0.55"/>
  <line x1="650" y1="125" x2="700" y2="75" stroke="${colors.accent}" stroke-width="2" opacity="0.55"/>
  <line x1="300" y1="245" x2="405" y2="245" stroke="${colors.accent}" stroke-width="2" opacity="0.55"/>
  <line x1="675" y1="245" x2="780" y2="245" stroke="${colors.accent}" stroke-width="2" opacity="0.55"/>
  <circle cx="540" cy="205" r="105" fill="${colors.accentSoft}"/>
  <circle cx="540" cy="205" r="72" fill="${colors.accentSofter}"/>
  <path d="M493 205 L526 238 L596 154" fill="none" stroke="${colors.accent}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="540" y="445" fill="${colors.text}" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="84" font-weight="900" text-anchor="middle">Sesion completada</text>
  <line x1="285" y1="525" x2="405" y2="525" stroke="${colors.accent}" stroke-width="3" opacity="0.65"/>
  <text x="540" y="542" fill="${colors.accent}" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="900" text-anchor="middle">${sessionName}</text>
  <line x1="675" y1="525" x2="795" y2="525" stroke="${colors.accent}" stroke-width="3" opacity="0.65"/>
  <rect x="90" y="630" width="900" height="420" rx="40" fill="${colors.grid}" stroke="${colors.gridStroke}" stroke-width="2"/>
  <line x1="540" y1="630" x2="540" y2="1050" stroke="${colors.gridStroke}" stroke-width="2"/>
  <line x1="90" y1="840" x2="990" y2="840" stroke="${colors.gridStroke}" stroke-width="2"/>
  <circle cx="205" cy="735" r="55" fill="${colors.accentSoft}"/>
  <path d="M168 735 H182 M228 735 H242 M182 720 V750 M196 712 V758 M214 712 V758 M228 720 V750 M196 735 H214" fill="none" stroke="${colors.accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="320" y="710" fill="${colors.muted}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">Ejercicios</text>
  <text x="320" y="780" fill="${colors.text}" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="58" font-weight="900">${completed}/${total}</text>
  <text x="320" y="830" fill="${colors.muted}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">completados</text>
  <circle cx="655" cy="735" r="55" fill="${colors.accentSoft}"/>
  <path d="M630 752 L650 732 L666 746 L690 720 M670 720 H690 V740" fill="none" stroke="${colors.accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="770" y="710" fill="${colors.muted}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">Avance</text>
  <text x="770" y="780" fill="${colors.text}" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="58" font-weight="900">${percentage}%</text>
  <text x="770" y="830" fill="${colors.muted}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">completado</text>
  <circle cx="205" cy="945" r="55" fill="${colors.accentSoft}"/>
  <path d="M207 980 C185 976 174 959 179 941 C183 925 196 918 197 899 C214 912 221 924 218 938 C225 933 230 926 231 917 C245 933 250 949 244 963 C237 978 222 984 207 980 Z" fill="none" stroke="${colors.accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="320" y="920" fill="${colors.muted}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">Racha</text>
  <text x="320" y="990" fill="${colors.text}" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="58" font-weight="900">${streak}</text>
  <text x="320" y="1040" fill="${colors.muted}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">dias</text>
  <circle cx="655" cy="945" r="55" fill="${colors.accentSoft}"/>
  <rect x="625" y="918" width="60" height="62" rx="10" fill="none" stroke="${colors.accent}" stroke-width="8"/>
  <path d="M625 938 H685 M640 906 V928 M670 906 V928" fill="none" stroke="${colors.accent}" stroke-width="8" stroke-linecap="round"/>
  <text x="770" y="920" fill="${colors.muted}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">Fecha</text>
  <text x="770" y="990" fill="${colors.text}" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="48" font-weight="900">${dateDayMonth}</text>
  <text x="770" y="1040" fill="${colors.muted}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">registrado</text>
  <line x1="90" y1="1190" x2="350" y2="1190" stroke="${colors.accent}" stroke-width="2" opacity="0.55"/>
  <rect x="390" y="1147" width="300" height="86" rx="43" fill="${colors.accentSoft}" stroke="${colors.pillStroke}"/>
  <text x="540" y="1203" fill="${colors.accent}" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="900" text-anchor="middle">#CoraFit</text>
  <line x1="730" y1="1190" x2="990" y2="1190" stroke="${colors.accent}" stroke-width="2" opacity="0.55"/>
</svg>`;
}

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function formatFullDate(date: string, dayOfWeek: string) {
  const parsed = new Date(`${date}T00:00:00`);
  const formatted = parsed.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
  });
  return `${longDay(dayOfWeek)} ${formatted}`;
}

function isFinalized(status?: ClientPortalStatus) {
  return status === "completed" || status === "partially_completed";
}

function calendarDayTone(day: ClientPortalDay): CalendarDayTone {
  if (!day.session || day.status === "no_session") return "rest";
  if (day.status === "overdue") return "overdue";
  if (day.status === "completed") return "completed";
  if (day.status === "partially_completed") return "partially_completed";
  if (day.status === "opened" || day.status === "in_progress") return "active";
  return "pending";
}

function calendarDayActionLabel(day: ClientPortalDay) {
  if (!day.session) return "Descanso";
  if (day.log) return isFinalized(day.log.status) ? "Ver sesion" : "Continuar";
  if (day.status === "overdue") return "Abrir atrasada";
  if (!day.canOpen) return "Vista previa";
  return "Iniciar";
}

function mobileCalendarDayActionLabel(day: ClientPortalDay) {
  const label = calendarDayActionLabel(day);
  return label === "Ver sesion" ? "Ver sesión" : label;
}

function calendarDayShortLabel(day: ClientPortalDay) {
  if (!day.session) return "Descanso";
  if (day.status === "overdue") return "Atrasada";
  if (day.status === "completed") return "Completada";
  if (day.status === "partially_completed") return "Parcial";
  if (day.status === "opened" || day.status === "in_progress")
    return "En curso";
  return day.canOpen ? "Pendiente" : "Proxima";
}

function CalendarStatusIcon({ day }: { day: ClientPortalDay }) {
  if (isFinalized(day.status)) return <Check className="size-5" />;
  if (!day.session) return <RotateCcw className="size-5" />;
  if (day.status === "overdue") return <AlertTriangle className="size-5" />;
  if (day.status === "opened" || day.status === "in_progress")
    return <ChevronRight className="size-5" />;
  return null;
}

function CalendarStatusBadge({
  day,
  className,
}: {
  day: ClientPortalDay;
  className?: string;
}) {
  const tone = calendarDayTone(day);
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-bold",
        calendarBadgeToneClasses[tone],
        className,
      )}
    >
      {statusLabels[day.status]}
    </span>
  );
}

function MobileCalendarStatusBadge({
  day,
  className,
}: {
  day: ClientPortalDay;
  className?: string;
}) {
  const tone = calendarDayTone(day);
  return (
    <Badge
      variant={mobileCalendarBadgeVariant(tone)}
      className={cn(
        "max-w-full justify-center truncate px-2 py-0.5 text-[11px] font-semibold",
        className,
      )}
    >
      {statusLabels[day.status]}
    </Badge>
  );
}

function mobileCalendarBadgeVariant(tone: CalendarDayTone): BadgeVariant {
  if (tone === "completed") return "success";
  if (tone === "overdue") return "danger";
  if (tone === "partially_completed") return "warning";
  if (tone === "active") return "default";
  if (tone === "pending") return "outline";
  return "muted";
}

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) return caught.message;
  return fallback;
}

function formatPortalLockMessage(lockedUntil?: string | null) {
  if (!lockedUntil) {
    return "Tu acceso esta bloqueado temporalmente por intentos fallidos. Intenta mas tarde. Si no recuerdas tu PIN, pide a tu coach que regenere tu acceso.";
  }

  const parsed = new Date(lockedUntil);
  if (Number.isNaN(parsed.getTime())) {
    return "Tu acceso esta bloqueado temporalmente por intentos fallidos. Intenta mas tarde. Si no recuerdas tu PIN, pide a tu coach que regenere tu acceso.";
  }

  return `Tu acceso esta bloqueado temporalmente por intentos fallidos. Intenta despues de las ${parsed.toLocaleTimeString(
    "es-MX",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )}. Si no recuerdas tu PIN, pide a tu coach que regenere tu acceso.`;
}
