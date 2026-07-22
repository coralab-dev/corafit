"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  CircleDashed,
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
  Lock,
  ListChecks,
  Loader2,
  MoreHorizontal,
  Pencil,
  Ruler,
  PlayCircle,
  RotateCcw,
  Scale,
  Share2,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  MessageCircle,
  Monitor,
  Moon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CoraFitApiError } from "@/lib/api/authenticated-request";
import { CoraFitBrand } from "@/components/shared/corafit-brand";
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
  applyProgressTabError,
  applyProgressTabSuccess,
  buildMeasurementSummary,
  buildNoteSummary,
  buildPhotoSummary,
  canClientDeleteProgressPhoto,
  deleteProgressPhotoById,
  getVisibleMeasurementFields,
  shouldAutoLoadProgressTab,
  upsertProgressPhoto,
  type ProgressTabState,
} from "@/components/client-portal/client-progress-remaining-state";
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
import {
  buildCompletionCardSvg,
  buildCompletionPresentation,
  buildShareText,
  isFinalizedCompletionStatus,
  type CompletionPresentation,
} from "@/components/client-portal/completion-card-presentation";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
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

const portalThemeOptions = [
  {
    value: "light",
    label: "Claro",
    description: "Fondo claro, ideal para el día.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Oscuro",
    description: "Reduce el brillo en lugares con poca luz.",
    icon: Moon,
  },
  {
    value: "system",
    label: "Sistema",
    description: "Se adapta al tema de tu dispositivo.",
    icon: Monitor,
  },
] as const;

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

export function PinAccessScreen({
  token,
  clientName,
}: {
  token: string;
  clientName?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pin, setPin] = useState("");
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [helpMessage, setHelpMessage] = useState<string | null>(null);
  const digits = 6;

  const submitPin = useCallback(
    async (value: string) => {
      if (value.length !== digits) return;
      setState("loading");
      setError(null);
      setHelpMessage(null);
      try {
        const result = await verifyPin(token, value);
        if (result.success) {
          router.replace(`/c/${encodeURIComponent(token)}/home`);
          return;
        }
        if (result.locked) {
          setError(formatPortalLockMessage(result.lockedUntil));
        } else {
          setError(formatRemainingAttempts(result.remainingAttempts));
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
    setHelpMessage(null);

    if (nextPin.length === digits) {
      void submitPin(nextPin);
    }
  }

  return (
    <ClientPortalShell token={token}>
      <section className="client-portal-viewport flex items-center justify-center px-5 py-8 sm:px-6 md:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <CoraFitBrand className="h-8 w-auto" />
          </div>

          <div className="rounded-3xl border border-transparent bg-card p-5 shadow-[var(--surface-shadow)] sm:p-7">
            <div className="flex flex-col items-center text-center">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Lock aria-hidden="true" className="size-5" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold leading-tight text-foreground">
                Ingresa tu PIN
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Usa el PIN de 6 dígitos que te compartió tu coach.
              </p>
              {clientName ? (
                <p className="mt-3 text-sm font-medium text-primary">
                  Hola, {clientName}
                </p>
              ) : null}
            </div>

            <div
              className="mt-6 rounded-2xl focus-within:outline-none focus-within:ring-[3px] focus-within:ring-ring/25"
              onClick={() => inputRef.current?.focus()}
              onPointerDown={(event) => {
                event.preventDefault();
                inputRef.current?.focus();
              }}
            >
              <input
                aria-describedby="pin-access-feedback"
                aria-invalid={Boolean(error)}
                aria-label="PIN de acceso de 6 dígitos"
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
              <div
                aria-hidden="true"
                className={cn(
                  "grid grid-cols-6 gap-2 sm:gap-3",
                  state === "loading" && "opacity-80",
                )}
              >
                {Array.from({ length: digits }).map((_, index) => {
                  const isCurrent =
                    state !== "loading" &&
                    !error &&
                    index === pin.length &&
                    index < digits;

                  return (
                    <span
                      className={cn(
                        "flex aspect-square min-w-0 items-center justify-center rounded-xl border border-border bg-background text-xl font-semibold text-foreground transition-colors",
                        pin[index] && "border-primary/50 bg-primary/5",
                        isCurrent && "border-primary ring-2 ring-primary/20",
                        error &&
                          "border-destructive bg-destructive/5 text-destructive",
                      )}
                      key={index}
                    >
                      {pin[index] ? "•" : ""}
                    </span>
                  );
                })}
              </div>
            </div>

            <div
              className="mt-5 min-h-14 text-center text-sm leading-6"
              id="pin-access-feedback"
            >
              {state === "loading" ? (
                <div
                  aria-live="polite"
                  className="inline-flex items-center gap-2 text-muted-foreground"
                  role="status"
                >
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Validando PIN…
                </div>
              ) : error ? (
                <div
                  className="inline-flex items-start gap-2 text-left text-destructive"
                  role="alert"
                >
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <button
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setError(null);
                  setHelpMessage(
                    "Pide a tu coach que regenere tu acceso y te comparta un nuevo PIN.",
                  );
                  inputRef.current?.focus();
                }}
                type="button"
              >
                ¿Olvidaste tu PIN?
              </button>
              {pin ? (
                <button
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={state === "loading"}
                  onClick={() => {
                    setPin("");
                    setError(null);
                    setHelpMessage(null);
                    inputRef.current?.focus();
                  }}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" className="size-4" />
                  Borrar PIN
                </button>
              ) : null}
            </div>

            <div className="mt-3 min-h-10 text-center text-sm leading-6 text-muted-foreground">
              {helpMessage ? (
                <div
                  aria-live="polite"
                  className="inline-flex items-start gap-2 text-left"
                  role="status"
                >
                  <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{helpMessage}</span>
                </div>
              ) : null}
            </div>
          </div>

          <p className="mt-5 flex items-start justify-center gap-2 px-1 text-center text-sm leading-6 text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Tu coach te compartió este enlace privado y un PIN de acceso.</span>
          </p>
        </div>
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
      <section
        className={cn(
          "-mb-[calc(7.5rem+env(safe-area-inset-bottom))] px-5 pt-6 md:px-8 lg:mb-0 lg:px-10 lg:pt-8",
          !detailOpen && "flex min-h-dvh flex-col lg:min-h-0",
        )}
      >
        {!detailOpen ? (
          <SessionBackLink href={`/c/${encodeURIComponent(token)}/calendar`} />
        ) : null}
        {error ? <InlineError message={error} /> : null}
        <div
          className={cn(
            "mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6",
            !detailOpen && "flex flex-1 flex-col",
          )}
        >
          <div className={cn("min-w-0", !detailOpen && "flex flex-1 flex-col")}>
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
                onNext={() =>
                  setActiveExerciseIndex((current) =>
                    Math.min(current + 1, total - 1),
                  )
                }
                onPrevious={() =>
                  setActiveExerciseIndex((current) => Math.max(current - 1, 0))
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
            ) : (
              <div className="flex flex-1 flex-col">
                <SessionOverviewCard completedCount={completed.length} total={total} />
                {activeExercise ? (
                  <div className="mt-4 space-y-3">
                    {log.snapshotData.exercises.map((exercise, index) => (
                      <SessionExerciseListCard
                        completed={completed.includes(exercise.sessionExerciseId)}
                        exercise={exercise}
                        index={index}
                        key={exercise.sessionExerciseId}
                        loading={busyId === exercise.sessionExerciseId}
                        onComplete={() => void complete(exercise.sessionExerciseId)}
                        onOpen={() => {
                          setActiveExerciseIndex(index);
                          setDetailOpen(true);
                        }}
                        total={total}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4"><EmptyCard title="No hay ejercicios en esta sesión." /></div>
                )}
                <div className="sticky bottom-0 z-20 -mx-5 mt-auto space-y-2 border-t border-border/50 bg-background/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur md:-mx-8 lg:hidden">
                  <Button
                    className="h-12 w-full"
                    aria-busy={finalizing}
                    disabled={finalizing || total === 0}
                    onClick={() => requestFinalize(completed.length, total)}
                  >
                    {finalizing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}{" "}
                    Finalizar sesión
                  </Button>
                  <Button
                    className="h-12 w-full"
                    disabled={finalizing}
                    onClick={() =>
                      router.push(`/c/${encodeURIComponent(token)}/home`)
                    }
                    variant="ghost"
                  >
                    <Home className="size-4" /> Salir por ahora
                  </Button>
                </div>
              </div>
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
      <section
        className={cn(
          "-mb-[calc(7.5rem+env(safe-area-inset-bottom))] px-5 pt-6 md:px-8 lg:mb-0 lg:px-10 lg:pt-8",
          !detailOpen && "flex min-h-dvh flex-col lg:min-h-0",
        )}
      >
        {!detailOpen ? (
          <SessionBackLink href={`/c/${encodeURIComponent(token)}/calendar`} />
        ) : null}
        {error ? <InlineError message={error} /> : null}
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm font-medium leading-6 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
          <p>Esta sesión está programada para después. Puedes revisar ejercicios y notas, pero todavía no se puede iniciar.</p>
        </div>
        <div
          className={cn(
            "mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6",
            !detailOpen && "flex flex-1 flex-col",
          )}
        >
          <div className={cn("min-w-0", !detailOpen && "flex flex-1 flex-col")}>
            {detailOpen && activeExercise ? (
              <ClientExerciseDetailView
                completed={false}
                completedCount={0}
                exercise={activeExercise}
                index={activeExerciseIndex}
                loading={false}
                onBack={() => setDetailOpen(false)}
                onComplete={() => undefined}
                onNext={() =>
                  setActiveExerciseIndex((current) =>
                    Math.min(current + 1, total - 1),
                  )
                }
                onPrevious={() =>
                  setActiveExerciseIndex((current) => Math.max(current - 1, 0))
                }
                onUseAlternative={() => undefined}
                readOnly
                selectedAlternativeId={null}
                total={total}
              />
            ) : (
              <div className="flex flex-1 flex-col">
                <SessionOverviewCard readOnly completedCount={0} total={total} />
                {activeExercise ? <div className="mt-4 space-y-3">
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
                      total={total}
                    />
                  ))}
                </div> : <div className="mt-4"><EmptyCard title="No hay ejercicios en esta sesión." /></div>}
                <div className="sticky bottom-0 z-20 -mx-5 mt-auto border-t border-border/50 bg-background/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur md:-mx-8 lg:hidden">
                  <Button
                    className="h-12 w-full whitespace-normal"
                    disabled
                    variant="secondary"
                  >
                    Disponible en la fecha programada
                  </Button>
                </div>
              </div>
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
  const router = useRouter();
  const [data, setData] = useState<CompletionCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [busyAction, setBusyAction] = useState<CompletionBusyAction>(null);
  const [feedback, setFeedback] = useState<CompletionFeedback | null>(null);
  const [shareFallback, setShareFallback] = useState<string | null>(null);
  const { resolvedTheme } = useAppTheme();
  const requestInFlightRef = useRef(false);
  const redirectingRef = useRef(false);

  const redirectToSession = useCallback(() => {
    if (redirectingRef.current) return;

    redirectingRef.current = true;
    setIsRedirecting(true);
    router.replace(
      `/c/${encodeURIComponent(token)}/session/${encodeURIComponent(sessionLogId)}`,
    );
  }, [router, sessionLogId, token]);

  const load = useCallback(() => {
    if (requestInFlightRef.current || redirectingRef.current) return;

    requestInFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    setData(null);
    setFeedback(null);
    setShareFallback(null);

    void clientPortalRequest<CompletionCard>(
      `/client-portal/${encodeURIComponent(token)}/session-logs/${encodeURIComponent(sessionLogId)}/completion-card`,
    )
      .then((result) => {
        if (!isFinalizedCompletionStatus(result.status)) {
          redirectToSession();
          return;
        }

        setData(result);
      })
      .catch((caught: unknown) => {
        if (caught instanceof CoraFitApiError && caught.status === 403) {
          redirectToSession();
          return;
        }

        setError(
          caught instanceof CoraFitApiError && caught.status === 404
            ? "Este logro no está disponible"
            : errorMessage(caught, "No pudimos cargar tu logro."),
        );
      })
      .finally(() => {
        requestInFlightRef.current = false;
        setIsLoading(false);
      });
  }, [redirectToSession, sessionLogId, token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (data && !isFinalizedCompletionStatus(data.status)) {
      redirectToSession();
    }
  }, [data, redirectToSession]);

  const presentation =
    data && isFinalizedCompletionStatus(data.status)
      ? buildCompletionPresentation(data)
      : null;

  async function shareCompletion() {
    if (!data || !presentation || busyAction) return;

    const shareData = {
      title: `CoraFit - ${presentation.shareTitle}`,
      text: presentation.shareText,
    };

    setBusyAction("share");
    setFeedback(null);
    setShareFallback(null);

    try {
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          setFeedback({ tone: "success", message: "Compartir listo." });
          return;
        } catch (caught) {
          if (caught instanceof DOMException && caught.name === "AbortError") {
            return;
          }
          // Fall through to the clipboard fallback.
        }
      }

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareData.text);
          setFeedback({
            tone: "success",
            message: "Copiamos tu logro para que lo compartas donde prefieras.",
          });
          return;
        } catch {
          // Fall through to the visible manual fallback.
        }
      }

      setFeedback({
        detail: "Selecciona y copia el texto para compartirlo donde prefieras.",
        message: "No pudimos copiar el logro automáticamente.",
        tone: "error",
      });
      setShareFallback(buildShareText(presentation));
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        return;
      }

      setFeedback({
        detail: "Selecciona y copia el texto para compartirlo donde prefieras.",
        message: "No pudimos compartir el logro automáticamente.",
        tone: "error",
      });
      setShareFallback(buildShareText(presentation));
    } finally {
      setBusyAction(null);
    }
  }

  async function saveCompletionImage() {
    if (!data || !presentation || busyAction) return;

    setBusyAction("save");
    setFeedback(null);
    setShareFallback(null);
    let url: string | null = null;

    try {
      const svg = buildCompletionCardSvg(presentation, resolvedTheme === "dark");
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      url = URL.createObjectURL(blob);
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
      setFeedback({ tone: "success", message: "Descarga iniciada." });
    } catch {
      setFeedback({
        message:
          "No pudimos guardar la imagen automáticamente. Vuelve a intentarlo.",
        tone: "error",
      });
    } finally {
      if (url) URL.revokeObjectURL(url);
      setBusyAction(null);
    }
  }

  return (
    <ClientPortalShell token={token}>
      <section className="client-portal-viewport flex min-h-dvh flex-col px-5 py-6 md:px-8 md:py-8 lg:px-10">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <CoraFitBrand className="h-8 w-auto" />
          <p className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Resultado de sesión
          </p>
        </header>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center py-6 lg:py-10">
          {isRedirecting || (data && !presentation) ? (
            <CompletionRedirectingState />
          ) : isLoading ? (
            <CompletionLoadingState />
          ) : error ? (
            <CompletionErrorState
              message={error}
              onRetry={() => load()}
              token={token}
            />
          ) : presentation && data ? (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-center">
              <div className="w-full max-w-xl">
                <CompletionShareCard presentation={presentation} />
              </div>
              <CompletionActions
                busyAction={busyAction}
                feedback={feedback}
                onSave={() => void saveCompletionImage()}
                onShare={() => void shareCompletion()}
                shareFallback={shareFallback}
                token={token}
              />
            </div>
          ) : null}
        </div>
      </section>
    </ClientPortalShell>
  );
}

type CompletionBusyAction = "share" | "save" | null;

type CompletionFeedback = {
  tone: "success" | "error";
  message: string;
  detail?: string;
};

function CompletionLoadingState() {
  return (
    <div
      aria-live="polite"
      className="flex min-h-56 flex-col items-center justify-center text-center"
      role="status"
    >
      <Loader2
        aria-hidden="true"
        className="size-8 animate-spin text-[var(--portal-accent)]"
      />
      <p className="mt-4 text-base font-semibold text-foreground">
        Preparando tu logro
      </p>
    </div>
  );
}

function CompletionRedirectingState() {
  return (
    <div
      aria-live="polite"
      className="flex min-h-56 flex-col items-center justify-center text-center"
      role="status"
    >
      <Loader2
        aria-hidden="true"
        className="size-8 animate-spin text-[var(--portal-accent)]"
      />
      <p className="mt-4 text-base font-semibold text-foreground">
        Abriendo tu sesión
      </p>
    </div>
  );
}

function CompletionErrorState({
  message,
  onRetry,
  token,
}: {
  message: string;
  onRetry: () => void;
  token: string;
}) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-destructive/25 bg-card p-6 shadow-[var(--surface-shadow-soft)] sm:p-8">
      <div
        aria-live="assertive"
        className="flex items-start gap-3"
        role="alert"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            No pudimos abrir tu logro
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button className="min-h-11 flex-1" onClick={onRetry} type="button">
          <RotateCcw aria-hidden="true" className="size-4" />
          Reintentar
        </Button>
        <Button asChild className="min-h-11 flex-1" variant="outline">
          <Link href={`/c/${encodeURIComponent(token)}/home`}>Volver al inicio</Link>
        </Button>
      </div>
      <Button
        asChild
        className="mt-2 min-h-11 w-full"
        variant="ghost"
      >
        <Link href={`/c/${encodeURIComponent(token)}/calendar`}>Ver calendario</Link>
      </Button>
    </div>
  );
}

function CompletionShareCard({
  presentation,
}: {
  presentation: CompletionPresentation;
}) {
  const StatusIcon =
    presentation.variant === "completed" ? CheckCircle2 : CircleDashed;
  const isPartial = presentation.variant === "partial";

  return (
    <article
      aria-label={
        presentation.variant === "completed"
          ? "Resumen de sesión completada"
          : "Resumen de sesión registrada parcialmente"
      }
      className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card p-5 text-foreground shadow-[var(--surface-shadow-soft)] sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <CoraFitBrand className="h-5 w-auto shrink-0" />
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Entrenamiento
        </span>
      </div>

      <div className="mt-7 flex flex-col items-center">
        <div
          className={cn(
            "relative flex size-20 items-center justify-center rounded-full",
            isPartial
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
              : "bg-primary/10 text-primary",
          )}
        >
          <StatusIcon aria-hidden="true" className="relative size-8 sm:size-9" />
        </div>
      </div>

      <div className="mt-5 text-center">
        <h1 className="mx-auto max-w-[18ch] break-words text-3xl font-bold leading-tight tracking-tight text-foreground">
          {presentation.title}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-muted-foreground">
          {presentation.supportingText}
        </p>
      </div>

      <CompletionPrimaryResult presentation={presentation} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <CompletionSecondaryStat
          icon={<Flame aria-hidden="true" className="size-4" />}
          label="Racha"
          value={presentation.streakCompactLabel}
        />
        <CompletionSecondaryStat
          icon={<Calendar aria-hidden="true" className="size-4" />}
          label="Fecha"
          valueClassName="whitespace-nowrap text-sm min-[360px]:text-base sm:text-xl"
          value={presentation.formattedDateCompact}
        />
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm font-semibold text-foreground">
          Entrenando con CoraFit
        </p>
      </div>
    </article>
  );
}

function CompletionPrimaryResult({
  presentation,
}: {
  presentation: CompletionPresentation;
}) {
  const isPartial = presentation.variant === "partial";
  const progress = Math.min(
    100,
    Math.max(0, presentation.completionPercentage),
  );

  return (
    <section
      aria-label="Resultado principal de la sesión"
      className={cn(
        "mt-6 rounded-2xl border border-transparent p-5",
        isPartial
          ? "bg-amber-500/5"
          : "bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 break-words text-base font-semibold text-foreground">
          {presentation.primaryResultLabel}
        </p>
        <p className="shrink-0 text-3xl font-bold leading-none text-foreground">
          {presentation.completionPercentage}%
        </p>
      </div>
      <div
        aria-label={`${presentation.progressLabel}: ${presentation.completionPercentage}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            isPartial ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-sm font-medium text-muted-foreground">
        {presentation.progressLabel}
      </p>
    </section>
  );
}

function CompletionSecondaryStat({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-background/60 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.1em]">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-3 break-words text-lg font-semibold leading-tight text-foreground sm:text-xl",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CompletionActions({
  busyAction,
  feedback,
  onSave,
  onShare,
  shareFallback,
  token,
}: {
  busyAction: CompletionBusyAction;
  feedback: CompletionFeedback | null;
  onSave: () => void;
  onShare: () => void;
  shareFallback: string | null;
  token: string;
}) {
  return (
    <aside
      aria-label="Acciones del logro"
      className="w-full lg:sticky lg:top-6 lg:max-w-xs"
    >
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--surface-shadow-soft)] sm:p-5">
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-1">
          <Button
            aria-busy={busyAction === "share"}
            className="min-h-11 w-full"
            disabled={busyAction !== null}
            onClick={onShare}
            type="button"
            variant="outline"
          >
            {busyAction === "share" ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Share2 aria-hidden="true" className="size-4" />
            )}
            Compartir
          </Button>
          <Button
            aria-busy={busyAction === "save"}
            className="min-h-11 w-full"
            disabled={busyAction !== null}
            onClick={onSave}
            type="button"
            variant="outline"
          >
            {busyAction === "save" ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Download aria-hidden="true" className="size-4" />
            )}
            Guardar imagen
          </Button>
        </div>

        {feedback ? <CompletionFeedbackView feedback={feedback} /> : null}
        {shareFallback ? (
          <div className="mt-3 rounded-xl border border-border/70 bg-background/65 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Texto para compartir
            </p>
            <p className="mt-2 select-text whitespace-pre-line break-words text-sm leading-6 text-foreground">
              {shareFallback}
            </p>
          </div>
        ) : null}

        <div className="mt-5 space-y-3 border-t border-border/70 pt-5">
          <Button asChild className="min-h-12 w-full" size="lg">
            <Link href={`/c/${encodeURIComponent(token)}/home`}>
              Volver al inicio
            </Link>
          </Button>
          <Button asChild className="min-h-11 w-full" variant="ghost">
            <Link href={`/c/${encodeURIComponent(token)}/calendar`}>
              <Calendar aria-hidden="true" className="size-4" />
              Ver calendario
            </Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}

function CompletionFeedbackView({
  feedback,
}: {
  feedback: CompletionFeedback;
}) {
  const isError = feedback.tone === "error";
  return (
    <div
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm leading-6",
        isError
          ? "border-destructive/25 bg-destructive/5 text-destructive"
          : "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
      )}
      role={isError ? "alert" : "status"}
    >
      {isError ? (
        <AlertTriangle aria-hidden="true" className="mt-1 size-4 shrink-0" />
      ) : (
        <CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0" />
      )}
      <div>
        <p className="font-semibold">{feedback.message}</p>
        {feedback.detail ? <p className="mt-1">{feedback.detail}</p> : null}
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

function initialProgressTabState<T>(data: T): ProgressTabState<T> {
  return {
    data,
    error: null,
    loaded: false,
    loading: false,
    requestId: 0,
  };
}

export function ClientPortalProgressScreen({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<PortalProgressTab>("weight");
  const [weightState, setWeightState] = useState(
    initialProgressTabState<ClientPortalWeightLog[]>([]),
  );
  const [measurementState, setMeasurementState] = useState(
    initialProgressTabState<ClientPortalBodyMeasurement[]>([]),
  );
  const [photoState, setPhotoState] = useState(
    initialProgressTabState<ClientPortalProgressPhoto[]>([]),
  );
  const [noteState, setNoteState] = useState(
    initialProgressTabState<ClientPortalProgressNote[]>([]),
  );
  const [weightSaving, setWeightSaving] = useState(false);
  const [deletingWeightId, setDeletingWeightId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const tabRequestIds = useRef<Record<PortalProgressTab, number>>({
    measurements: 0,
    notes: 0,
    photos: 0,
    weight: 0,
  });

  const loadProgressTab = useCallback(
    async (tab: PortalProgressTab) => {
      const requestId = tabRequestIds.current[tab] + 1;
      tabRequestIds.current[tab] = requestId;

      const markLoading = <T,>(
        setState: Dispatch<SetStateAction<ProgressTabState<T>>>,
      ) => {
        setState((current) => ({
          ...current,
          error: null,
          loading: true,
          requestId,
        }));
      };

      const encoded = encodeURIComponent(token);

      try {
        if (tab === "weight") {
          markLoading(setWeightState);
          const result = await clientPortalRequest<ClientPortalWeightLog[]>(
            `/client-portal/${encoded}/progress/weight-logs`,
          );
          setWeightState((current) =>
            current.requestId === requestId
              ? applyProgressTabSuccess(current, result)
              : current,
          );
          return;
        }

        if (tab === "measurements") {
          markLoading(setMeasurementState);
          const result = await clientPortalRequest<ClientPortalBodyMeasurement[]>(
            `/client-portal/${encoded}/progress/body-measurements`,
          );
          setMeasurementState((current) =>
            current.requestId === requestId
              ? applyProgressTabSuccess(current, result)
              : current,
          );
          return;
        }

        if (tab === "photos") {
          markLoading(setPhotoState);
          const result = await clientPortalRequest<ClientPortalProgressPhoto[]>(
            `/client-portal/${encoded}/progress/photos`,
          );
          setPhotoState((current) =>
            current.requestId === requestId
              ? applyProgressTabSuccess(current, result)
              : current,
          );
          return;
        }

        markLoading(setNoteState);
        const result = await clientPortalRequest<ClientPortalProgressNote[]>(
          `/client-portal/${encoded}/progress/notes`,
        );
        setNoteState((current) =>
          current.requestId === requestId
            ? applyProgressTabSuccess(current, result)
            : current,
        );
      } catch (caught) {
        const message = errorMessage(caught, "No pudimos cargar tu progreso.");

        if (tab === "weight") {
          setWeightState((current) =>
            current.requestId === requestId
              ? applyProgressTabError(current, message)
              : current,
          );
        } else if (tab === "measurements") {
          setMeasurementState((current) =>
            current.requestId === requestId
              ? applyProgressTabError(current, message)
              : current,
          );
        } else if (tab === "photos") {
          setPhotoState((current) =>
            current.requestId === requestId
              ? applyProgressTabError(current, message)
              : current,
          );
        } else {
          setNoteState((current) =>
            current.requestId === requestId
              ? applyProgressTabError(current, message)
              : current,
          );
        }
      }
    },
    [token],
  );

  useEffect(() => {
    const stateByTab: Record<PortalProgressTab, ProgressTabState<unknown[]>> = {
      measurements: measurementState,
      notes: noteState,
      photos: photoState,
      weight: weightState,
    };
    const state = stateByTab[activeTab];

    if (shouldAutoLoadProgressTab(state)) {
      void loadProgressTab(activeTab);
    }
  }, [
    activeTab,
    loadProgressTab,
    measurementState,
    noteState,
    photoState,
    weightState,
  ]);

  async function saveWeight(
    input: { note?: string | null; recordedAt: string; weightKg: number },
    id?: string,
  ): Promise<boolean> {
    setWeightSaving(true);
    setWeightState((current) => ({ ...current, error: null }));
    try {
      const encoded = encodeURIComponent(token);
      const saved = await clientPortalRequest<ClientPortalWeightLog>(
        `/client-portal/${encoded}/progress/weight-logs${id ? `/${id}` : ""}`,
        {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(input),
        },
      );
      setWeightState((current) => ({
        ...current,
        data: upsertWeightLog(current.data, saved),
      }));
      return true;
    } catch (caught) {
      setWeightState((current) => ({
        ...current,
        error: isForbidden(caught)
          ? "Tu coach no habilito el registro de peso o este registro no es editable."
          : errorMessage(caught, "No pudimos guardar el peso."),
      }));
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
    setWeightState((current) => ({ ...current, error: null }));
    try {
      await clientPortalRequest(
        `/client-portal/${encodeURIComponent(token)}/progress/weight-logs/${id}`,
        { method: "DELETE" },
      );
      setWeightState((current) => ({
        ...current,
        data: deleteWeightLogById(current.data, id),
      }));
      return true;
    } catch (caught) {
      setWeightState((current) => ({
        ...current,
        error: isForbidden(caught)
          ? "Solo puedes borrar registros de peso creados por ti."
          : errorMessage(caught, "No pudimos borrar el peso."),
      }));
      return false;
    } finally {
      setDeletingWeightId(null);
    }
  }

  async function uploadPhoto(formData: FormData): Promise<boolean> {
    setUploadingPhoto(true);
    setPhotoState((current) => ({ ...current, error: null }));
    try {
      const saved = await clientPortalFormDataRequest<ClientPortalProgressPhoto>(
        `/client-portal/${encodeURIComponent(token)}/progress/photos`,
        formData,
      );
      setPhotoState((current) => ({
        ...current,
        data: upsertProgressPhoto(current.data, saved),
        loaded: true,
      }));
      return true;
    } catch (caught) {
      setPhotoState((current) => ({
        ...current,
        error: isForbidden(caught)
          ? "No tienes permiso para subir esta foto."
          : errorMessage(caught, "No pudimos subir la foto."),
      }));
      return false;
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function deletePhoto(id: string): Promise<boolean> {
    if (deletingPhotoId !== null) {
      return false;
    }

    setDeletingPhotoId(id);
    setPhotoState((current) => ({ ...current, error: null }));
    try {
      await clientPortalRequest(
        `/client-portal/${encodeURIComponent(token)}/progress/photos/${id}`,
        { method: "DELETE" },
      );
      setPhotoState((current) => ({
        ...current,
        data: deleteProgressPhotoById(current.data, id),
      }));
      return true;
    } catch (caught) {
      setPhotoState((current) => ({
        ...current,
        error: isForbidden(caught)
          ? "Solo puedes borrar fotos subidas por ti."
          : errorMessage(caught, "No pudimos borrar la foto."),
      }));
      return false;
    } finally {
      setDeletingPhotoId(null);
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

          <TabsContent value="weight">
            {weightState.loading && !weightState.loaded ? (
              <ScreenState title="Cargando peso" compact />
            ) : null}
            {weightState.error && !weightState.loaded ? (
              <ProgressTabError
                loading={weightState.loading}
                message={weightState.error}
                onRetry={() => void loadProgressTab("weight")}
              />
            ) : null}
            {weightState.loaded ? (
              <PortalWeightSection
                deletingId={deletingWeightId}
                error={weightState.error}
                formSaving={weightSaving}
                items={weightState.data}
                onDelete={deleteWeight}
                onSave={saveWeight}
              />
            ) : null}
          </TabsContent>
          <TabsContent value="measurements">
            {measurementState.loading && !measurementState.loaded ? (
              <ScreenState title="Cargando medidas" compact />
            ) : null}
            {measurementState.error && !measurementState.loaded ? (
              <ProgressTabError
                loading={measurementState.loading}
                message={measurementState.error}
                onRetry={() => void loadProgressTab("measurements")}
              />
            ) : null}
            {measurementState.loaded ? (
              <PortalMeasurementsSection
                error={measurementState.error}
                items={measurementState.data}
                loading={measurementState.loading}
                onRetry={() => void loadProgressTab("measurements")}
              />
            ) : null}
          </TabsContent>
          <TabsContent value="photos">
            {photoState.loading && !photoState.loaded ? (
              <ScreenState title="Cargando fotos" compact />
            ) : null}
            {photoState.error && !photoState.loaded ? (
              <ProgressTabError
                loading={photoState.loading}
                message={photoState.error}
                onRetry={() => void loadProgressTab("photos")}
              />
            ) : null}
            {photoState.loaded ? (
              <PortalPhotosSection
                deletingId={deletingPhotoId}
                error={photoState.error}
                items={photoState.data}
                loading={photoState.loading}
                uploading={uploadingPhoto}
                onDelete={deletePhoto}
                onRetry={() => void loadProgressTab("photos")}
                onUpload={uploadPhoto}
              />
            ) : null}
          </TabsContent>
          <TabsContent value="notes">
            {noteState.loading && !noteState.loaded ? (
              <ScreenState title="Cargando notas" compact />
            ) : null}
            {noteState.error && !noteState.loaded ? (
              <ProgressTabError
                loading={noteState.loading}
                message={noteState.error}
                onRetry={() => void loadProgressTab("notes")}
              />
            ) : null}
            {noteState.loaded ? (
              <PortalNotesSection
                error={noteState.error}
                items={noteState.data}
                loading={noteState.loading}
                onRetry={() => void loadProgressTab("notes")}
              />
            ) : null}
          </TabsContent>
        </Tabs>
      </section>
    </ClientPortalShell>
  );
}

export function ClientPortalSettingsScreen({ token }: { token: string }) {
  const { resolvedTheme, setTheme, theme } = useAppTheme();
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const selectedTheme = isMounted ? theme : "system";
  const selectedThemeLabel =
    selectedTheme === "system"
      ? `Sistema · ${resolvedTheme === "dark" ? "oscuro" : "claro"}`
      : selectedTheme === "dark"
        ? "Oscuro"
        : "Claro";

  return (
    <ClientPortalShell token={token} active="settings">
      <section className="px-5 pb-10 pt-6 md:px-8 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-3xl lg:mx-0">
          <h1 className="text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
            Configuración
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
            Personaliza cómo se ve el portal en este dispositivo.
          </p>

          <section className="mt-8 rounded-2xl border border-transparent bg-card p-5 shadow-[var(--surface-shadow-soft)] md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Settings className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  Apariencia
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Elige cómo quieres ver el portal.
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Estado actual:{" "}
              <span className="text-foreground">{selectedThemeLabel}</span>
            </p>

            <fieldset className="mt-5 grid gap-3">
              <legend className="sr-only">Tema del portal</legend>
              {portalThemeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedTheme === option.value;

                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex min-h-20 w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-within:outline-none focus-within:ring-[3px] focus-within:ring-ring/25",
                      isSelected
                        ? "border-primary/45 bg-primary/5 text-foreground"
                        : "border-border/70 bg-background hover:border-primary/30 hover:bg-accent/40",
                    )}
                  >
                    <input
                      checked={isSelected}
                      className="sr-only"
                      name="portal-theme"
                      onChange={() => setTheme(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground",
                        isSelected && "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold text-foreground">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-sm leading-6 text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 text-transparent",
                        isSelected &&
                          "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {isSelected ? <Check className="size-4" /> : null}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          </section>

          <p className="mt-4 flex items-start gap-2 px-1 text-sm leading-6 text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Esta preferencia solo cambia la apariencia del portal en este
              dispositivo.
            </span>
          </p>
        </div>
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
        className="rounded-2xl border border-transparent bg-card p-3 shadow-[var(--surface-shadow-soft)] sm:p-5"
      >
        <div className="grid grid-cols-2 divide-x divide-border/70">
          <div className="flex min-w-0 gap-2 px-3 sm:gap-4 sm:px-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] sm:size-12">
              <Scale className="size-5 sm:size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                Último peso
              </p>
              <p className="mt-1 break-words text-lg font-semibold text-foreground sm:text-2xl">
                {summary.latestWeightKg === null
                  ? "Sin registros"
                  : `${summary.latestWeightKg} kg`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {summary.latestRecordedAt
                  ? `Último registro · ${formatWeightRecordedDate(summary.latestRecordedAt)}`
                  : "Sin fecha registrada"}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 gap-2 px-3 sm:gap-4 sm:px-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground sm:size-12">
              <ListChecks className="size-5 sm:size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                Registros visibles
              </p>
              <p className="mt-1 break-words text-lg font-semibold text-foreground sm:text-2xl">
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
              const savingEditedItem = formSaving && editing?.id === item.id;

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
                            disabled={hasPendingDelete || savingEditedItem}
                            onClick={() => {
                              if (!hasPendingDelete && !savingEditedItem) {
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
          const deletedId = confirmDelete.id;
          const wasEditingDeletedRecord = editing?.id === deletedId;
          const deleted = await onDelete(deletedId);

          if (deleted && wasEditingDeletedRecord) {
            resetForm();
          }
        }}
      />
    </div>
  );
}

function SummaryMetric({
  icon,
  label,
  muted = false,
  value,
}: {
  icon: ReactNode;
  label: string;
  muted?: boolean;
  value: string;
}) {
  return (
    <div className={cn("flex min-w-0 gap-2 px-3 sm:gap-4 sm:px-5", muted && "")}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-2xl sm:size-12 [&_svg]:size-5 sm:[&_svg]:size-6",
          muted
            ? "bg-muted text-muted-foreground"
            : "bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">
          {label}
        </p>
        <p className="mt-1 break-words text-lg font-semibold text-foreground sm:text-2xl">
          {value}
        </p>
      </div>
    </div>
  );
}

function ProgressTabError({
  loading,
  message,
  onRetry,
}: {
  loading: boolean;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
      <p className="font-semibold">{message}</p>
      <Button
        className="mt-3"
        disabled={loading}
        onClick={onRetry}
        size="sm"
        type="button"
        variant="outline"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Reintentar
      </Button>
    </div>
  );
}

function ProgressKnownDataError({
  error,
  loading,
  onRetry,
}: {
  error: string | null;
  loading: boolean;
  onRetry: () => void;
}) {
  if (!error) return null;

  return <ProgressTabError loading={loading} message={error} onRetry={onRetry} />;
}

function PortalMeasurementsSection({
  error,
  items,
  loading,
  onRetry,
}: {
  error: string | null;
  items: ClientPortalBodyMeasurement[];
  loading: boolean;
  onRetry: () => void;
}) {
  const summary = buildMeasurementSummary(items);

  return (
    <div className="mt-5 space-y-6">
      <ProgressKnownDataError
        error={error}
        loading={loading}
        onRetry={onRetry}
      />
      <section
        aria-label="Resumen de medidas"
        className="rounded-2xl border border-transparent bg-card p-3 shadow-[var(--surface-shadow-soft)] sm:p-5"
      >
        <div className="grid grid-cols-2 divide-x divide-border/70">
          <SummaryMetric
            icon={<Ruler className="size-5 sm:size-6" aria-hidden="true" />}
            label="Último registro"
            value={
              summary.latestRecordedAt
                ? portalFormatProgressDate(summary.latestRecordedAt)
                : "Sin registros"
            }
          />
          <SummaryMetric
            icon={<ListChecks className="size-5 sm:size-6" aria-hidden="true" />}
            label="Registros visibles"
            value={summary.visibleCount.toString()}
            muted
          />
        </div>
      </section>

      <section aria-labelledby="measurement-history-title" className="space-y-3">
        <h2
          id="measurement-history-title"
          className="text-xl font-semibold text-foreground"
        >
          Historial de medidas
        </h2>
      {items.length === 0 ? (
        <PortalEmpty text="No hay medidas visibles por ahora." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const fields = getVisibleMeasurementFields(item);

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--surface-shadow-soft)] sm:p-5"
              >
                <div className="flex min-w-0 gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]">
                    <Calendar className="size-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold text-foreground">
                      {portalFormatProgressDate(item.recordedAt)}
                    </h3>
                    {item.note ? (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/80">
                        {item.note}
                      </p>
                    ) : null}
                  </div>
                </div>
                {fields.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-border/80 bg-muted/40 p-4 text-sm font-medium text-muted-foreground">
                    Sin medidas visibles en este registro.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3">
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        className="min-w-0 rounded-xl border border-border/70 bg-background/40 p-2.5 sm:p-3"
                      >
                        <p className="truncate text-xs font-medium text-muted-foreground">
                          {field.label}
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold text-foreground sm:text-base">
                          {field.value} cm
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      </section>
    </div>
  );
}

function PortalPhotosSection({
  deletingId,
  error,
  items,
  loading,
  onDelete,
  onRetry,
  onUpload,
  uploading,
}: {
  deletingId: string | null;
  error: string | null;
  items: ClientPortalProgressPhoto[];
  loading: boolean;
  onDelete: (id: string) => Promise<boolean>;
  onRetry: () => void;
  onUpload: (formData: FormData) => Promise<boolean>;
  uploading: boolean;
}) {
  const [photoType, setPhotoType] =
    useState<ClientPortalProgressPhotoType>("front");
  const [recordedAt, setRecordedAt] = useState(getLocalWeightDateInputValue());
  const [file, setFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] =
    useState<ClientPortalProgressPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const summary = buildPhotoSummary(items);
  const hasPendingDelete = deletingId !== null;
  const currentLocalDate = getLocalWeightDateInputValue();
  const photoFormDirty =
    file !== null || photoType !== "front" || recordedAt !== currentLocalDate;

  function resetPhotoForm() {
    setPhotoType("front");
    setRecordedAt(getLocalWeightDateInputValue());
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="mt-5 space-y-6">
      <ProgressKnownDataError
        error={error}
        loading={loading}
        onRetry={onRetry}
      />
      <section
        aria-label="Resumen de fotos"
        className="rounded-2xl border border-transparent bg-card p-3 shadow-[var(--surface-shadow-soft)] sm:p-5"
      >
        <div className="grid grid-cols-2 divide-x divide-border/70">
          <SummaryMetric
            icon={<Camera className="size-5 sm:size-6" aria-hidden="true" />}
            label="Fotos visibles"
            value={summary.visibleCount.toString()}
          />
          <SummaryMetric
            icon={<Calendar className="size-5 sm:size-6" aria-hidden="true" />}
            label="Última foto"
            value={
              summary.latestRecordedAt
                ? portalFormatProgressDate(summary.latestRecordedAt)
                : "Sin fotos"
            }
            muted
          />
        </div>
      </section>

      <form
        className="grid gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--surface-shadow-soft)] sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1fr_2fr]"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!file) return;
          const formData = new FormData();
          formData.append("photoType", photoType);
          formData.append("recordedAt", recordedAt);
          formData.append("photo", file);
          const uploaded = await onUpload(formData);

          if (uploaded) {
            resetPhotoForm();
          }
        }}
      >
        <div className="sm:col-span-2 lg:col-span-3">
          <h2 className="text-xl font-semibold text-foreground">
            Subir foto de progreso
          </h2>
        </div>
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="progress-photo-type">Tipo</Label>
          <select
            id="progress-photo-type"
            className="h-10 w-full rounded-xl border bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
            disabled={uploading}
            value={photoType}
            onChange={(event) =>
              setPhotoType(event.target.value as ClientPortalProgressPhotoType)
            }
          >
            {Object.entries(portalPhotoLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="progress-photo-date">Fecha</Label>
          <Input
            id="progress-photo-date"
            disabled={uploading}
            type="date"
            value={recordedAt}
            onChange={(event) => setRecordedAt(event.target.value)}
          />
        </div>
        <div className="grid min-w-0 gap-2">
          <span className="text-sm font-medium leading-none">Foto</span>
          <input
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            aria-label="Archivo de foto de progreso"
            className="sr-only"
            id="progress-photo-file"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <Button
              disabled={uploading}
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? "Cambiar foto" : "Seleccionar foto"}
            </Button>
            <p className="min-w-0 truncate text-sm text-muted-foreground">
              {file?.name ?? "Ningún archivo seleccionado"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            JPG, PNG o WebP. Máximo 8 MB.
          </p>
        </div>
        <p className="flex gap-2 text-sm leading-6 text-muted-foreground sm:col-span-2 lg:col-span-3">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Tus fotos se almacenan de forma privada y solo se muestran dentro del
          portal al personal autorizado.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end lg:col-span-3">
          {photoFormDirty ? (
            <Button
              disabled={uploading}
              type="button"
              variant="outline"
              onClick={resetPhotoForm}
            >
              Cancelar
            </Button>
          ) : null}
          <Button aria-busy={uploading} disabled={uploading || !file} type="submit">
            {uploading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Subir
          </Button>
        </div>
      </form>
      {items.length === 0 ? (
        <PortalEmpty text="Aun no hay fotos de progreso." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--surface-shadow-soft)]"
            >
              <div className="relative aspect-[4/3] w-full bg-muted">
                <NextImage
                  alt={`Foto ${portalPhotoLabels[item.photoType]}`}
                  className="object-cover"
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  src={item.signedUrl}
                  unoptimized
                />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {portalPhotoLabels[item.photoType]}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      {portalFormatProgressDate(item.recordedAt)}
                    </p>
                  </div>
                  <Badge
                    className="gap-1.5"
                    variant={item.uploadedByType === "client" ? "success" : "info"}
                  >
                    {item.uploadedByType === "client"
                      ? "Subida por ti"
                      : "Subida por coach"}
                  </Badge>
                </div>
                {canClientDeleteProgressPhoto(item) ? (
                  <Button
                    aria-busy={deletingId === item.id}
                    className="w-full border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={hasPendingDelete}
                    onClick={() => {
                      if (!hasPendingDelete) {
                        setConfirmDelete(item);
                      }
                    }}
                    type="button"
                    variant="outline"
                  >
                    {deletingId === item.id ? (
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                    Borrar
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDelete(null);
          }
        }}
        title="¿Borrar foto de progreso?"
        description="Esta foto se eliminará de tu galería de progreso."
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

function PortalNotesSection({
  error,
  items,
  loading,
  onRetry,
}: {
  error: string | null;
  items: ClientPortalProgressNote[];
  loading: boolean;
  onRetry: () => void;
}) {
  const summary = buildNoteSummary(items);

  return (
    <div className="mt-5 space-y-6">
      <ProgressKnownDataError
        error={error}
        loading={loading}
        onRetry={onRetry}
      />
      <section
        aria-label="Resumen de notas"
        className="rounded-2xl border border-transparent bg-card p-3 shadow-[var(--surface-shadow-soft)] sm:p-5"
      >
        <div className="grid grid-cols-2 divide-x divide-border/70">
          <SummaryMetric
            icon={<MessageCircle className="size-5 sm:size-6" aria-hidden="true" />}
            label="Notas visibles"
            value={summary.visibleCount.toString()}
          />
          <SummaryMetric
            icon={<Calendar className="size-5 sm:size-6" aria-hidden="true" />}
            label="Última nota"
            value={
              summary.latestCreatedAt
                ? portalFormatProgressDate(summary.latestCreatedAt)
                : "Sin notas"
            }
            muted
          />
        </div>
      </section>
      {items.length === 0 ? (
        <PortalEmpty text="No hay notas visibles por ahora." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--surface-shadow-soft)] sm:p-5"
            >
              <div className="flex min-w-0 gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]">
                  <MessageCircle className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">Nota de tu coach</Badge>
                    <span className="text-sm text-muted-foreground">
                      {portalFormatProgressDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap break-words text-base leading-7 text-foreground">
                    {item.text}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function PortalEmpty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border/80 bg-card p-5 text-center text-sm font-semibold text-muted-foreground shadow-[var(--surface-shadow-soft)]">
      {text}
    </p>
  );
}

function portalFormatProgressDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
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

function SessionOverviewCard({
  completedCount,
  readOnly = false,
  total,
}: {
  completedCount: number;
  readOnly?: boolean;
  total: number;
}) {
  const percentage = total ? Math.round((completedCount / total) * 100) : 0;
  const remaining = Math.max(total - completedCount, 0);
  const exerciseLabel = `${total} ${total === 1 ? "ejercicio" : "ejercicios"}`;
  const statusMessage =
    total === 0
      ? "No hay ejercicios en esta sesión"
      : completedCount === 0
        ? "Comienza con el primer ejercicio"
      : remaining > 0
        ? `${remaining} ${remaining === 1 ? "ejercicio restante" : "ejercicios restantes"}`
        : "Todo listo para finalizar";

  return (
    <section className="rounded-2xl border border-transparent bg-card p-4 shadow-[var(--surface-shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-base font-bold text-foreground">
          {readOnly ? "Vista de lectura" : "Progreso de la sesión"}
        </h2>
        <span className="shrink-0 text-sm font-bold text-foreground">
          {readOnly ? exerciseLabel : `${completedCount} de ${total}`}
        </span>
      </div>
      {readOnly ? (
        <>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            Revisa la rutina antes de la fecha programada.
          </p>
          <div className="mt-3 h-1.5 rounded-full bg-muted" aria-hidden="true" />
        </>
      ) : (
        <>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="min-w-0 text-sm leading-5 text-muted-foreground">
              {statusMessage}
            </p>
            <span className="shrink-0 text-sm font-bold text-foreground">
              {percentage}%
            </span>
          </div>
          <div
            aria-label={`${percentage}% de la sesión completada`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={percentage}
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percentage}%` }} />
          </div>
        </>
      )}
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
  const progress = total ? Math.round((completedCount / total) * 100) : 0;
  return (
    <aside className="hidden lg:sticky lg:top-8 lg:block">
      <div className="rounded-2xl border border-transparent bg-card p-5 shadow-[var(--surface-shadow-soft)]">
        <p className="text-sm font-bold text-muted-foreground">{readOnly ? "Vista de lectura" : "Progreso actual"}</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-foreground">{readOnly ? total : `${completedCount}/${total}`}</p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{readOnly ? (total === 1 ? "ejercicio" : "ejercicios") : "ejercicios completados"}</p>
          </div>
          {!readOnly ? <Badge variant="muted">{progress}%</Badge> : null}
        </div>
        {!readOnly ? <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${progress}% de la sesión completada`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div> : null}
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          {total === 0
            ? "No hay ejercicios en esta sesión"
            : readOnly
              ? "Sesión programada"
              : pendingCount > 0
                ? completedCount === 0
                  ? "Comienza con el primer ejercicio."
                  : `${pendingCount} ${pendingCount === 1 ? "ejercicio pendiente" : "ejercicios pendientes"}.`
                : completedCount === 0
                  ? "Comienza con el primer ejercicio."
                  : "Todo listo para finalizar."}
        </p>
        <div className="mt-6 space-y-3">
          <Button className="h-12 w-full whitespace-normal"
            aria-busy={finalizing}
            disabled={finalizing || readOnly || total === 0}
            onClick={onFinalize}
            variant={readOnly ? "secondary" : "default"}
          >
            {readOnly ? (
              "Disponible en la fecha programada"
            ) : finalizing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {readOnly ? null : "Finalizar sesión"}
          </Button>
          <Button className="h-12 w-full" variant="outline"
            disabled={finalizing}
            onClick={onSave}
          >
            <Home className="size-4" /> {readOnly ? "Volver al calendario" : "Salir por ahora"}
          </Button>
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
  total,
  onComplete,
  onOpen,
}: {
  exercise: ClientSessionExercise;
  index: number;
  completed: boolean;
  loading: boolean;
  readOnly?: boolean;
  total: number;
  onComplete: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="flex min-h-24 min-w-0 items-center gap-2 rounded-2xl border border-transparent bg-card p-3 shadow-[var(--surface-shadow-soft)] sm:gap-3 sm:p-4">
      <button
        aria-label={`Abrir detalle de ${exercise.exercise.name}, ejercicio ${index + 1} de ${total}${readOnly ? ", modo lectura" : ""}`}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 sm:gap-4"
        onClick={onOpen}
        type="button"
      >
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary sm:size-11",
            completed && !readOnly && "bg-primary text-primary-foreground",
          )}
        >
          {completed && !readOnly ? <Check className="size-4" /> : index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-5 text-foreground sm:text-lg">
            {exercise.exercise.name}
          </h3>
          <p className="mt-1.5 text-sm font-medium leading-5 text-muted-foreground">
            {exercise.sets ?? "-"} series × {exercise.reps}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-5 text-muted-foreground">
            {exercise.restSeconds != null ? `${exercise.restSeconds} seg de descanso` : "Sin descanso indicado"}
          </p>
        </div>
        {readOnly ? <Badge variant="muted">Lectura</Badge> : null}
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      {!readOnly ? (
        <div className="flex shrink-0 items-center">
          <button
          aria-busy={loading}
          aria-label={`Marcar ${exercise.exercise.name} como completado`}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
            completed &&
              "border-primary bg-primary text-primary-foreground",
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
        </div>
      ) : null}
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
}) {
  const progress = total ? (completedCount / total) * 100 : 0;
  const selectedAlternative = exercise.alternatives.find(
    (alternative) => alternative.id === selectedAlternativeId,
  );
  const suggestedAlternative =
    selectedAlternative ?? exercise.alternatives[0] ?? null;
  const detailStartRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    detailStartRef.current?.scrollIntoView({
      block: "start",
      behavior: "auto",
    });
  }, [index]);

  return (
    <article
      className={cn(
        readOnly && "pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-0",
      )}
      ref={detailStartRef}
    >
      <div className="flex items-center justify-between gap-3">
        <Button
          aria-label="Volver"
          className="shrink-0"
          onClick={onBack}
          size="icon"
          type="button"
          variant="outline"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 text-center">
          <p className="truncate text-base font-semibold text-foreground">
            Detalle del ejercicio
          </p>
        </div>
        <div className="size-10 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-foreground">
            Ejercicio {index + 1} de {total}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {Math.round(progress)}% completado
          </span>
        </div>
        <div
          aria-label={`${Math.round(progress)}% de la sesión completada`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(progress)}
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-7 flex items-end justify-between gap-4">
        <h1 className="min-w-0 break-words text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
          {exercise.exercise.name}
        </h1>
      </div>

      <ExerciseMediaHero
        exercise={exercise.exercise}
        key={exercise.sessionExerciseId}
      />
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
        <Button
          disabled={index === 0}
          onClick={onPrevious}
          type="button"
          variant="outline"
        >
          <ChevronLeft className="size-4" /> Anterior
        </Button>
        <Button
          disabled={index >= total - 1}
          onClick={onNext}
          type="button"
          variant="outline"
        >
          Siguiente <ChevronRight className="size-4" />
        </Button>
      </div>

      {!readOnly ? (
        <div className="sticky bottom-0 z-20 -mx-5 mt-6 border-t border-border/50 bg-background/95 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur md:-mx-8 md:px-8 lg:hidden">
          {completed ? (
            <Button
              className="h-14 w-full whitespace-normal"
              onClick={index >= total - 1 ? onBack : onNext}
              type="button"
              variant="default"
            >
              {index >= total - 1 ? (
                <>
                  <ArrowLeft className="size-5" /> Volver a la sesión
                </>
              ) : (
                <>
                  <ChevronRight className="size-5" /> Siguiente
                </>
              )}
            </Button>
          ) : (
            <Button
              aria-busy={loading}
              className="h-14 w-full whitespace-normal"
              disabled={loading}
              onClick={onComplete}
              type="button"
              variant="default"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Check className="size-5" />
              )}{" "}
              Marcar completado
            </Button>
          )}
        </div>
      ) : null}
    </article>
  );
}

function ExerciseMediaHero({
  exercise,
}: {
  exercise: ClientSessionExercise["exercise"];
}) {
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [mediaMode, setMediaMode] = useState<"image" | "video">(
    exercise.mediaUrl ? "image" : "video",
  );
  const embedUrl = getYouTubeEmbedUrl(exercise.videoUrl);
  const hasImage = Boolean(exercise.mediaUrl);
  const hasVideo = Boolean(exercise.videoUrl);

  if (!hasImage && !hasVideo) {
    return (
      <div className="mt-5 flex aspect-video min-h-56 items-center justify-center rounded-2xl border border-dashed border-border bg-muted text-center">
        <div>
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-bold text-muted-foreground">
            Sin demostración adjunta
          </p>
        </div>
      </div>
    );
  }

  const imageUrl = exercise.mediaUrl;
  const showImage = Boolean(imageUrl) && (mediaMode === "image" || !embedUrl);
  const showVideo = mediaMode === "video" && Boolean(embedUrl);

  return (
    <div className="mt-5">
      {hasImage && hasVideo ? (
        <div className="mb-3 flex w-fit items-center gap-1 rounded-xl border border-border/60 bg-card p-1">
          <Button
            aria-pressed={mediaMode === "image"}
            onClick={() => setMediaMode("image")}
            size="sm"
            type="button"
            variant={mediaMode === "image" ? "secondary" : "ghost"}
          >
            <Camera className="size-4" /> Imagen
          </Button>
          <Button
            aria-pressed={mediaMode === "video"}
            onClick={() => setMediaMode("video")}
            size="sm"
            type="button"
            variant={mediaMode === "video" ? "secondary" : "ghost"}
          >
            <PlayCircle className="size-4" /> Video
          </Button>
        </div>
      ) : null}
      {showImage ? (
        <button
          className="relative block aspect-video min-h-56 w-full overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-[var(--surface-shadow-soft)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
          type="button"
          aria-label={`Ampliar imagen de ${exercise.name}`}
          onClick={() => setIsImageOpen(true)}
        >
          <NextImage
            alt={`Demostración de ${exercise.name}`}
            className="size-full object-cover"
            fill
            sizes="(max-width: 640px) 100vw, 560px"
            src={imageUrl!}
            unoptimized
          />
        </button>
      ) : showVideo ? (
        <div className="aspect-video overflow-hidden rounded-2xl border border-border/60 bg-foreground shadow-[var(--surface-shadow-soft)]">
          <iframe
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            className="size-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            src={embedUrl!}
            title={`Video de demostración de ${exercise.name}`}
          />
        </div>
      ) : (
        <div className="flex aspect-video min-h-56 items-center justify-center rounded-2xl border border-border/60 bg-foreground p-5 text-center text-background shadow-[var(--surface-shadow-soft)]">
          <div>
            <PlayCircle className="mx-auto size-8" />
            <p className="mt-3 text-sm font-bold">Video no disponible aquí</p>
          </div>
        </div>
      )}
      {exercise.videoUrl && (mediaMode === "video" || !hasImage) ? (
        <Button asChild className="mt-3" size="sm" variant="outline">
          <a href={exercise.videoUrl} rel="noreferrer" target="_blank">
            <PlayCircle className="size-4 text-primary" /> Abrir en YouTube
          </a>
        </Button>
      ) : null}
      {isImageOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen completa de ${exercise.name}`}
          onClick={() => setIsImageOpen(false)}
        >
          <Button
            className="absolute right-4 top-4 z-10"
            type="button"
            aria-label="Cerrar imagen"
            onClick={(event) => {
              event.stopPropagation();
              setIsImageOpen(false);
            }}
            size="icon"
            variant="secondary"
          >
            <X className="size-5" />
          </Button>
          <div
            className="relative h-[calc(100dvh-7rem)] w-full max-w-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <NextImage
              alt={`Demostración de ${exercise.name}`}
              className="object-contain"
              fill
              sizes="100vw"
              src={imageUrl!}
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
            className="min-h-28 min-w-0 rounded-xl border border-border/60 bg-card p-4 shadow-[var(--surface-shadow-soft)]"
            key={metric.label}
          >
            <Icon className="size-6 text-primary" />
            <p className="mt-3 break-words text-xs font-medium leading-4 text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 break-words text-base font-semibold text-foreground">
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
  const contentId = `exercise-info-${title.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--surface-shadow-soft)]">
      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span className="text-primary">{icon}</span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <ChevronDown
          className={cn(
            "ml-auto size-5 text-muted-foreground transition-transform duration-200",
            !expanded && "-rotate-90",
          )}
        />
      </button>
      <p
        id={contentId}
        hidden={!expanded}
        className={cn(
          "mt-3 whitespace-pre-line text-sm leading-6 sm:text-base sm:leading-7",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </p>
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
  const detailsId = `alternative-details-${alternative.id}`;
  const alternativeEmbedUrl = getYouTubeEmbedUrl(alternative.exercise.videoUrl);
  const canView = Boolean(
    alternative.exercise.mediaUrl ||
    alternative.exercise.videoUrl ||
    alternative.exercise.instructions,
  );

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--surface-shadow-soft)]">
      <div className="flex items-center gap-3">
        <RotateCcw className="size-7 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          Alternativa sugerida
        </h2>
      </div>
      <div className="mt-4 grid grid-cols-[8rem_minmax(0,1fr)] gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-[var(--surface-shadow-soft)] sm:grid-cols-[9.5rem_minmax(0,1fr)]">
        <AlternativeMediaPreview alternative={alternative} />
        <div className="min-w-0 rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words text-base font-semibold leading-snug text-foreground">
                {alternative.exercise.name}
              </h3>
              {alternative.note ? (
                <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                  {alternative.note}
                </p>
              ) : null}
              <p className="mt-2 break-words text-sm font-medium text-muted-foreground">
                {exercise.sets ?? "-"} series x {exercise.reps} reps ·{" "}
                {exercise.restSeconds ?? "-"} seg descanso
              </p>
            </div>
            {isSelected ? (
              <Badge
                className="border-primary/20 bg-primary/10 text-primary"
                variant="outline"
              >
                En uso
              </Badge>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {alternative.exercise.videoUrl ? (
              <Button
                aria-controls={detailsId}
                aria-expanded={showDetails}
                className="h-11 min-w-0 whitespace-normal text-center"
                onClick={() => setShowDetails((current) => !current)}
                type="button"
                variant="outline"
              >
                <PlayCircle className="size-4 text-primary" />
                {showDetails ? "Ocultar video" : "Ver video"}
              </Button>
            ) : canView ? (
              <Button
                aria-controls={detailsId}
                aria-expanded={showDetails}
                className="h-11 min-w-0 whitespace-normal text-center"
                onClick={() => setShowDetails((current) => !current)}
                type="button"
                variant="outline"
              >
                Ver alternativa
              </Button>
            ) : null}
            {!readOnly ? (
              <Button
                className="h-11 min-w-0 whitespace-normal text-center"
                disabled={loading || isSelected}
                onClick={() => onUseAlternative(alternative.id)}
                type="button"
                variant="outline"
              >
                {isSelected ? "En uso" : "Usar alternativa"}
              </Button>
            ) : null}
          </div>
          {showDetails ? (
            <div
              className="mt-4 space-y-4 rounded-xl bg-muted p-4 text-sm leading-6 text-foreground"
              id={detailsId}
            >
              {alternative.exercise.videoUrl ? (
                alternativeEmbedUrl ? (
                  <div className="aspect-video overflow-hidden rounded-lg bg-foreground">
                    <iframe
                      allow="encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="size-full"
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      src={alternativeEmbedUrl}
                      title={`Video de demostración de ${alternative.exercise.name}`}
                    />
                  </div>
                ) : (
                  <p>
                    El video no se puede reproducir aquí. Puedes abrirlo en
                    YouTube.
                  </p>
                )
              ) : null}
              {alternative.exercise.instructions ? (
                <p className="whitespace-pre-line">
                  {alternative.exercise.instructions}
                </p>
              ) : null}
              {alternative.exercise.videoUrl ? (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={alternative.exercise.videoUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <PlayCircle className="size-4 text-primary" /> Abrir en
                    YouTube
                  </a>
                </Button>
              ) : null}
            </div>
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
      <div className="flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-center">
        <div className="px-3">
          <FileText className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-xs font-medium leading-5 text-muted-foreground">
            Sin demostración adjunta
          </p>
        </div>
      </div>
    );
  }

  if (!alternative.exercise.mediaUrl && alternative.exercise.videoUrl) {
    return (
      <a
        className="flex h-full min-h-32 items-center justify-center rounded-xl bg-foreground text-background"
        href={alternative.exercise.videoUrl}
        rel="noreferrer"
        target="_blank"
        aria-label={`Ver alternativa ${alternative.exercise.name}`}
      >
        <PlayCircle className="size-9" />
      </a>
    );
  }

  return (
    <div
      className="h-full min-h-32 rounded-xl bg-muted bg-cover bg-center"
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
      className="mt-6 hidden rounded-xl border border-border/60 bg-card p-3 shadow-[var(--surface-shadow-soft)] lg:block"
      aria-label="Ejercicios de la sesion"
    >
      <p className="px-2 pb-2 text-xs font-medium uppercase text-muted-foreground">
        {readOnly ? "Vista previa" : "Ejercicios"}
      </p>
      <div className="space-y-2">
        {exercises.map((exercise, itemIndex) => {
          const isActive = itemIndex === activeIndex;
          const isCompleted = completedIds.includes(exercise.sessionExerciseId);
          return (
            <Button
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "h-auto w-full justify-start gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              key={exercise.sessionExerciseId}
              onClick={() => onSelect(itemIndex)}
              type="button"
              variant="ghost"
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="size-4" /> : itemIndex + 1}
              </span>
              <span className="truncate">{exercise.exercise.name}</span>
            </Button>
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

function formatRemainingAttempts(count: number) {
  return count === 1
    ? "PIN incorrecto. Te queda 1 intento."
    : `PIN incorrecto. Te quedan ${count} intentos.`;
}

function formatPortalLockMessage(lockedUntil?: string | null) {
  if (!lockedUntil) {
    return "Tu acceso está bloqueado temporalmente por intentos fallidos. Intenta más tarde. Si no recuerdas tu PIN, pide a tu coach que regenere tu acceso.";
  }

  const parsed = new Date(lockedUntil);
  if (Number.isNaN(parsed.getTime())) {
    return "Tu acceso está bloqueado temporalmente por intentos fallidos. Intenta más tarde. Si no recuerdas tu PIN, pide a tu coach que regenere tu acceso.";
  }

  return `Tu acceso está bloqueado temporalmente por intentos fallidos. Intenta después de las ${parsed.toLocaleTimeString(
    "es-MX",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )}. Si no recuerdas tu PIN, pide a tu coach que regenere tu acceso.`;
}
