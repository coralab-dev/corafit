"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Dumbbell,
  Flame,
  Home,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Share2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  clientPortalRequest,
  verifyPin,
  type ClientPortalCalendar,
  type ClientPortalDay,
  type ClientPortalHome,
  type ClientPortalStatus,
  type ClientSessionLog,
  type ClientSessionPreview,
  type CompletionCard,
} from "@/lib/client-portal/api";

const dayLabels: Record<string, string> = {
  monday: "L",
  tuesday: "M",
  wednesday: "M",
  thursday: "J",
  friday: "V",
  saturday: "S",
  sunday: "D",
};

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

type CalendarDayTone = "rest" | "pending" | "overdue" | "active" | "completed" | "partially_completed";

const calendarCellToneClasses: Record<CalendarDayTone, string> = {
  rest: "border-[#e6e0db] bg-[#f5f2ef]",
  pending: "border-[#ece7e3] bg-white",
  overdue: "border-[#f1c7bd] bg-[#fff6f3]",
  active: "border-[#f4d5cb] bg-[#fff8f5]",
  completed: "border-[#cce7d2] bg-[#f6fbf7]",
  partially_completed: "border-[#f1dfb7] bg-[#fffbf0]",
};

const calendarBadgeToneClasses: Record<CalendarDayTone, string> = {
  rest: "bg-[#e9e4df] text-[#667080]",
  pending: "bg-[#eef1f4] text-[#667080]",
  overdue: "bg-[#ffe4dc] text-[#b63d31]",
  active: "bg-[#fff0ed] text-[#df4d3e]",
  completed: "bg-[#e4f6e8] text-[#2e8749]",
  partially_completed: "bg-[#fff1c9] text-[#9a6a12]",
};

const calendarIconToneClasses: Record<CalendarDayTone, string> = {
  rest: "border-[#d8d1ca] text-[#8b929d]",
  pending: "border-[#c9cdd3] text-[#667080]",
  overdue: "border-[#df4d3e] bg-[#df4d3e] text-white",
  active: "border-[#df4d3e] bg-[#df4d3e] text-white",
  completed: "border-[#49ad64] bg-[#49ad64] text-white",
  partially_completed: "border-[#d8a21b] bg-[#d8a21b] text-white",
};

const calendarButtonToneClasses: Record<CalendarDayTone, string> = {
  rest: "border border-[#e4dfda] bg-[#f4f1ef] text-[#8b929d]",
  pending: "bg-[#121722] text-white shadow-[0_10px_24px_rgba(18,23,34,0.16)]",
  overdue: "bg-[#df4d3e] text-white shadow-[0_10px_24px_rgba(223,77,62,0.22)]",
  active: "bg-[#df4d3e] text-white shadow-[0_10px_24px_rgba(223,77,62,0.22)]",
  completed: "bg-[#121722] text-white shadow-[0_10px_24px_rgba(18,23,34,0.16)]",
  partially_completed: "bg-[#121722] text-white shadow-[0_10px_24px_rgba(18,23,34,0.16)]",
};

const calendarLabelToneClasses: Record<CalendarDayTone, string> = {
  rest: "text-[#667080]",
  pending: "text-[#f18a2b]",
  overdue: "text-[#df4d3e]",
  active: "text-[#df4d3e]",
  completed: "text-[#2e8749]",
  partially_completed: "text-[#9a6a12]",
};

const clientPortalNavItems = [
  { key: "home", label: "Inicio", href: (token: string) => `/c/${encodeURIComponent(token)}/home`, icon: Home },
  { key: "calendar", label: "Calendario", href: (token: string) => `/c/${encodeURIComponent(token)}/calendar`, icon: Calendar },
] as const;

type ClientPortalNavKey = "home" | "calendar" | "progress" | "profile";
type ClientPortalNavItem = (typeof clientPortalNavItems)[number];

export function ClientPortalShell({
  token,
  active,
  children,
  hideCalendarNav,
}: {
  token: string;
  active?: ClientPortalNavKey;
  children: ReactNode;
  hideCalendarNav?: boolean;
}) {
  const navItems: readonly ClientPortalNavItem[] = hideCalendarNav
    ? clientPortalNavItems.filter((item) => item.key !== "calendar")
    : clientPortalNavItems;

  return (
    <main className="min-h-dvh bg-[#f8f7f5] text-[#121722]">
      <div className="mx-auto min-h-dvh w-full bg-[#fdfdfc] shadow-[0_22px_80px_rgba(18,23,34,0.10)] md:max-w-3xl lg:max-w-6xl lg:bg-transparent lg:shadow-none">
        {active ? <ClientPortalDesktopNav token={token} active={active} items={navItems} /> : null}
        <div className={cn("min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10", active && "lg:pl-64")}>
          {children}
        </div>
        {active ? <ClientPortalBottomNav token={token} active={active} items={navItems} /> : null}
      </div>
    </main>
  );
}

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
          setError("Tu acceso esta bloqueado temporalmente por intentos fallidos.");
        } else {
          setError(`PIN incorrecto. Intentos restantes: ${result.remainingAttempts}.`);
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
      <section className="flex min-h-screen flex-col px-8 py-12 md:px-10 lg:px-12">
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
                pin[index] && "border-[#df5b47] bg-[#fff3f0]",
              )}
              key={index}
            >
              {pin[index] ? "•" : ""}
            </span>
          ))}
        </button>
        <div className="mt-6 min-h-8 text-center text-sm font-semibold text-[#df5b47]">
          {state === "loading" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Validando
            </span>
          ) : (
            error
          )}
        </div>
        <button className="mt-4 text-sm font-bold text-[#3b5f9f]" type="button">
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

export function ClientHomeScreen({ token }: { token: string }) {
  const router = useRouter();
  const [data, setData] = useState<ClientPortalHome | null>(null);
  const [calendar, setCalendar] = useState<ClientPortalCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadHome() {
      try {
        const homeResult = await clientPortalRequest<ClientPortalHome>(`/client-portal/${encodeURIComponent(token)}/home`);
        if (!alive) return;

        setData(homeResult);

        if (homeResult.state === "no_plan") {
          setCalendar(null);
          return;
        }

        const calendarResult = await clientPortalRequest<ClientPortalCalendar>(`/client-portal/${encodeURIComponent(token)}/calendar`);
        if (alive) {
          setCalendar(calendarResult);
        }
      } catch (caught) {
        if (alive) setError(errorMessage(caught, "No pudimos cargar tu portal."));
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadHome();

    return () => {
      alive = false;
    };
  }, [token]);

  async function openSession(day: ClientPortalDay | null) {
    if (!day?.session) return;
    if (day.log) {
      router.push(`/c/${encodeURIComponent(token)}/session/${day.log.id}`);
      return;
    }
    setOpening(true);
    try {
      const log = await clientPortalRequest<ClientSessionLog>(
        `/client-portal/${encodeURIComponent(token)}/session-logs/open`,
        {
          method: "POST",
          body: JSON.stringify({ scheduledDate: day.date, trainingSessionId: day.session.id }),
        },
      );
      router.push(`/c/${encodeURIComponent(token)}/session/${log.id}`);
    } catch (caught) {
      setError(errorMessage(caught, "No pudimos abrir la sesion."));
    } finally {
      setOpening(false);
    }
  }

  if (loading) return <ScreenState title="Cargando tu portal" />;
  if (error && !data) return <ScreenState title="Algo salio mal" description={error} />;
  if (!data) return null;

  const actionableSession = data.todaySession?.session ? data.todaySession : data.nextPendingSession;
  const summary = data.week?.summary;
  const visibleStreak = calculateVisibleSessionStreak(calendar?.calendar?.days ?? [], calendar?.calendar?.today);
  const hasNoPlan = data.state === "no_plan";

  return (
    <ClientPortalShell token={token} active="home" hideCalendarNav={hasNoPlan}>
      <section className="px-6 pt-9 md:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <BrandMark compact />
        </header>
        <h1 className="mt-8 text-3xl font-bold tracking-normal">Hola, {firstName(data.client.name)}</h1>
        {hasNoPlan ? (
          <EmptyCard className="mt-6" title="Tu coach esta preparando tu plan." description="Te avisara cuando tu calendario de entrenamiento este listo." />
        ) : (
          <>
            <p className="mt-2 text-base text-[#667080]">Listo para tu entrenamiento de hoy.</p>
            <SessionHero day={actionableSession} loading={opening} onOpen={() => void openSession(actionableSession)} />
            <SectionHeader title="Tu semana" href={`/c/${encodeURIComponent(token)}/calendar`} />
            {calendar?.calendar ? <MiniWeek days={calendar.calendar.days} /> : <EmptyCard title={homeStateTitle(data.state)} />}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MetricCard label="Completadas" value={summary?.completedSessions ?? 0} caption="esta semana" tone="green" />
              <MetricCard label="Racha actual" value={visibleStreak} caption="dias" icon={<Flame className="size-6 text-[#f18a2b]" />} />
              <MetricCard label="Por completar" value={summary?.pendingSessions ?? 0} caption="esta semana" tone="orange" />
            </div>
          </>
        )}
      </section>
    </ClientPortalShell>
  );
}

export function WeeklyCalendarScreen({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const date = searchParams.get("date");
  const [data, setData] = useState<ClientPortalCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingDate, setOpeningDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(() => {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    clientPortalRequest<ClientPortalCalendar>(`/client-portal/${encodeURIComponent(token)}/calendar${query}`)
      .then(setData)
      .catch((caught) => setError(errorMessage(caught, "No pudimos cargar el calendario.")))
      .finally(() => setLoading(false));
  }, [date, token]);

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
          body: JSON.stringify({ scheduledDate: day.date, trainingSessionId: day.session.id }),
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
  const defaultSelectedDay = days.find((day) => day.date === data?.calendar?.today) ?? days.find((day) => day.session) ?? days[0];
  const selectedDay = days.find((day) => day.date === selectedDate) ?? defaultSelectedDay;
  const upcomingDays = selectedDay ? days.filter((day) => day.date > selectedDay.date) : [];

  return (
    <ClientPortalShell token={token} active="calendar">
      <section className="px-6 pt-8 md:px-8 lg:px-10">
        <div className="lg:hidden">
          <TopBar title="Calendario" backHref={`/c/${encodeURIComponent(token)}/home`} />
        </div>
        <header className="hidden lg:block">
          <h1 className="text-4xl font-bold tracking-normal text-[#09111f]">Calendario</h1>
          <p className="mt-3 text-base font-medium text-[#667080]">Revisa tus sesiones programadas y tu avance de la semana.</p>
        </header>
        {loading ? <ScreenState title="Cargando calendario" compact /> : null}
        {error ? <InlineError message={error} /> : null}
        {data?.calendar ? (
          <>
            <div className="mt-5 flex items-center gap-3 lg:mt-8 lg:max-w-3xl">
              <WeekButton direction="prev" date={data.calendar.weekStartDate} token={token} />
              <div className="flex-1 rounded-xl border border-[#ece7e3] bg-white py-3 text-center text-sm font-bold shadow-sm">
                {formatDate(data.calendar.weekStartDate)} - {formatDate(data.calendar.weekEndDate)}
              </div>
              <WeekButton direction="next" date={data.calendar.weekEndDate} token={token} />
            </div>
            <div className="mt-5 space-y-3 lg:hidden">
              {data.calendar.days.map((day) => (
                <CalendarDayCard
                  day={day}
                  key={day.date}
                  loading={openingDate === day.date}
                  onOpen={() => void open(day)}
                />
              ))}
            </div>
            <div className="mt-5 hidden grid-cols-7 gap-3 lg:grid">
              {data.calendar.days.map((day) => (
                <CalendarWeekCell
                  day={day}
                  selected={day.date === selectedDay?.date}
                  key={day.date}
                  onSelect={() => setSelectedDate(day.date)}
                />
              ))}
            </div>
            {selectedDay ? (
              <div className="hidden lg:block">
                <CalendarLegend />
                <SelectedSessionCard day={selectedDay} loading={openingDate === selectedDay.date} onOpen={() => void open(selectedDay)} />
                <UpcomingDays days={upcomingDays} />
              </div>
            ) : null}
          </>
        ) : !loading ? (
          <EmptyCard title={calendarStateTitle(data?.state)} />
        ) : null}
      </section>
    </ClientPortalShell>
  );
}

export function SessionScreen({ token, sessionLogId }: { token: string; sessionLogId: string }) {
  const router = useRouter();
  const [log, setLog] = useState<ClientSessionLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [confirmPartialOpen, setConfirmPartialOpen] = useState(false);

  const load = useCallback(() => {
    clientPortalRequest<ClientSessionLog>(
      `/client-portal/${encodeURIComponent(token)}/session-logs/${encodeURIComponent(sessionLogId)}`,
    )
      .then(setLog)
      .catch((caught) => setError(errorMessage(caught, "No pudimos cargar la sesion.")))
      .finally(() => setLoading(false));
  }, [sessionLogId, token]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!log || !isFinalized(log.status)) return;
    router.replace(`/c/${encodeURIComponent(token)}/session/${encodeURIComponent(sessionLogId)}/completed`);
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
    } catch (caught) {
      setError(errorMessage(caught, "No pudimos completar el ejercicio."));
    } finally {
      setBusyId(null);
    }
  }

  async function applyAlternative(sessionExerciseId: string, alternativeId: string) {
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
      router.push(`/c/${encodeURIComponent(token)}/session/${encodeURIComponent(sessionLogId)}/completed`);
    } catch (caught) {
      setError(errorMessage(caught, "Completa al menos un ejercicio antes de finalizar."));
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

  if (loading) return <ClientPortalShell token={token}><ScreenState title="Cargando sesion" /></ClientPortalShell>;
  if (!log) return <ClientPortalShell token={token}><ScreenState title="Sesion no disponible" description={error ?? undefined} /></ClientPortalShell>;

  const completed = log.snapshotData.progress?.completedExerciseIds ?? [];
  const total = log.snapshotData.exercises.length;
  const progressLabel = `${completed.length} / ${total}`;
  const pendingCount = Math.max(total - completed.length, 0);
  const visibleExercises = showPendingOnly
    ? log.snapshotData.exercises.filter((exercise) => !completed.includes(exercise.sessionExerciseId))
    : log.snapshotData.exercises;

  if (isFinalized(log.status)) return <ClientPortalShell token={token}><ScreenState title="Abriendo tu logro" /></ClientPortalShell>;

  return (
    <ClientPortalShell token={token}>
      <section className="px-5 pt-8 md:px-8 lg:px-10">
        <TopBar title={log.snapshotData.session.name} backHref={`/c/${encodeURIComponent(token)}/home`} />
        {error ? <InlineError message={error} /> : null}
        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
          <div className="min-w-0">
            <div className="rounded-xl border border-[#ece7e3] bg-white p-4 shadow-sm lg:hidden">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Progreso de la sesion</span>
                <span>{progressLabel}</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[#f0eeee]">
                <div className="h-2 rounded-full bg-[#df4d3e]" style={{ width: `${total ? (completed.length / total) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="mt-4 space-y-3 lg:mt-0">
              {visibleExercises.map((exercise) => (
                <ExerciseCard
                  completed={completed.includes(exercise.sessionExerciseId)}
                  exercise={exercise}
                  index={log.snapshotData.exercises.findIndex((item) => item.sessionExerciseId === exercise.sessionExerciseId)}
                  key={exercise.sessionExerciseId}
                  loading={busyId === exercise.sessionExerciseId}
                  onComplete={() => void complete(exercise.sessionExerciseId)}
                  onUseAlternative={(alternativeId) => void applyAlternative(exercise.sessionExerciseId, alternativeId)}
                  selectedAlternativeId={
                    log.snapshotData.progress?.usedAlternatives.find(
                      (alternative) => alternative.sessionExerciseId === exercise.sessionExerciseId,
                    )?.alternativeId ?? null
                  }
                />
              ))}
            </div>
            <button
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#ece7e3] bg-white text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pendingCount === 0 && !showPendingOnly}
              onClick={() => setShowPendingOnly((current) => !current)}
              type="button"
            >
              {showPendingOnly ? "Ver todos los ejercicios" : "Ver solo pendientes"} ({pendingCount}) <ChevronDown className={cn("size-4 transition", showPendingOnly && "rotate-180")} />
            </button>
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
        <div className="sticky bottom-0 -mx-5 mt-8 grid grid-cols-2 gap-3 border-t border-[#ece7e3] bg-white/95 px-5 py-5 backdrop-blur lg:hidden">
          <button
            className="flex h-14 items-center justify-center gap-2 rounded-xl border border-[#df5b47] text-sm font-bold text-[#df5b47]"
            onClick={() => router.push(`/c/${encodeURIComponent(token)}/home`)}
            type="button"
          >
            <Home className="size-4" /> Guardar y salir
          </button>
          <button
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-[#df4d3e] text-sm font-bold text-white shadow-[0_10px_24px_rgba(223,77,62,0.22)] disabled:opacity-60"
            disabled={finalizing}
            onClick={() => requestFinalize(completed.length, total)}
            type="button"
          >
            {finalizing ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Finalizar sesion
          </button>
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
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const sessionId = searchParams.get("session");
  const missingParams = !date || !sessionId;
  const [preview, setPreview] = useState<ClientSessionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (alive) setError(errorMessage(caught, "No pudimos cargar la vista de lectura."));
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
        <ScreenState title="Sesion no disponible" description="No pudimos identificar la sesion programada." />
      </ClientPortalShell>
    );
  }
  if (loading) return <ClientPortalShell token={token}><ScreenState title="Cargando sesion" /></ClientPortalShell>;
  if (!preview) return <ClientPortalShell token={token}><ScreenState title="Sesion no disponible" description={error ?? undefined} /></ClientPortalShell>;

  const total = preview.snapshotData.exercises.length;

  return (
    <ClientPortalShell token={token}>
      <section className="px-5 pt-8 md:px-8 lg:px-10">
        <TopBar title={preview.snapshotData.session.name} backHref={`/c/${encodeURIComponent(token)}/calendar`} />
        {error ? <InlineError message={error} /> : null}
        <div className="mt-6 rounded-xl border border-[#f5dfda] bg-[#fff8f7] p-4 text-sm font-semibold leading-6 text-[#8b3c31]">
          Esta sesion esta programada para despues. Puedes revisar ejercicios y notas, pero todavia no se puede iniciar.
        </div>
        <div className="mt-6 rounded-xl border border-[#ece7e3] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>Vista de lectura</span>
            <span>{total} ejercicios</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-[#f0eeee]" />
        </div>
        <div className="mt-4 space-y-3">
          {preview.snapshotData.exercises.map((exercise, index) => (
            <ExerciseCard
              completed={false}
              exercise={exercise}
              index={index}
              key={exercise.sessionExerciseId}
              loading={false}
              readOnly
              onComplete={() => undefined}
              onUseAlternative={() => undefined}
              selectedAlternativeId={null}
            />
          ))}
        </div>
        <div className="sticky bottom-0 -mx-5 mt-8 border-t border-[#ece7e3] bg-white/95 px-5 py-5 backdrop-blur">
          <button
            className="flex h-14 w-full items-center justify-center rounded-xl bg-[#ece7e3] text-sm font-bold text-[#667080]"
            disabled
            type="button"
          >
            Disponible en la fecha programada
          </button>
        </div>
      </section>
    </ClientPortalShell>
  );
}

export function CompletionCardScreen({ token, sessionLogId }: { token: string; sessionLogId: string }) {
  const [data, setData] = useState<CompletionCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareFallback, setShareFallback] = useState<string | null>(null);
  const [saveFallback, setSaveFallback] = useState<string | null>(null);

  useEffect(() => {
    clientPortalRequest<CompletionCard>(
      `/client-portal/${encodeURIComponent(token)}/session-logs/${encodeURIComponent(sessionLogId)}/completion-card`,
    )
      .then(setData)
      .catch((caught) => setError(errorMessage(caught, "No pudimos cargar tu logro.")));
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
        if (caught instanceof DOMException && caught.name === "AbortError") return;
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareData.text);
        setShareFallback("Copiamos tu logro para que lo compartas donde prefieras.");
        return;
      } catch {
        // Fall through to visible fallback.
      }
    }

    setShareFallback("Tu navegador no permite compartir automaticamente. Puedes copiar el resumen de la card.");
  }

  async function saveCompletionImage() {
    if (!data) return;

    setSaveFallback(null);

    const svg = buildCompletionCardSvg(data);
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
      setSaveFallback("No pudimos guardar la imagen automaticamente. Intenta compartir el resumen o vuelve a intentarlo.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <ClientPortalShell token={token}>
      <section className="flex min-h-screen flex-col px-5 py-6 md:px-8 lg:px-10">
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
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#cacacb] bg-white px-5 text-sm font-bold text-[#111111] transition hover:border-[#707072] hover:bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#275dc5] focus:ring-offset-2"
                onClick={() => void saveCompletionImage()}
                type="button"
              >
                <Download className="size-4" />
                Guardar imagen
              </button>
            </div>

            {shareFallback ? (
              <div className="mt-3 rounded-xl border border-[#ece7e3] bg-white p-4 text-sm leading-6 text-[#667080]" role="status">
                <p>{shareFallback}</p>
                <p className="mt-2 whitespace-pre-line font-medium text-[#09111f]">{buildShareText(data)}</p>
              </div>
            ) : null}

            {saveFallback ? (
              <div className="mt-3 rounded-xl border border-[#f2c8c0] bg-[#fff4f1] p-4 text-sm font-semibold leading-6 text-[#9f3529]" role="status">
                {saveFallback}
              </div>
            ) : null}
          </div>
        ) : (
          <ScreenState title="Preparando tu logro" compact />
        )}
        <div className="mt-auto space-y-3 pt-6">
          <Link className="flex h-14 items-center justify-center rounded-xl bg-[#df4d3e] text-sm font-bold text-white" href={`/c/${encodeURIComponent(token)}/home`}>
            Volver al inicio
          </Link>
          <Link className="flex h-14 items-center justify-center rounded-xl border border-[#ece7e3] bg-white text-sm font-bold" href={`/c/${encodeURIComponent(token)}/calendar`}>
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
      className="relative w-full overflow-hidden rounded-[28px] border border-[#f2ece7] bg-white px-5 pb-5 pt-6 text-[#071026] shadow-[0_22px_60px_rgba(18,23,34,0.14)]"
    >
      <div className="absolute left-1/2 top-6 h-24 w-32 -translate-x-1/2 text-[#a8d8ae]" aria-hidden>
        <span className="absolute left-1/2 top-0 h-7 w-px bg-current opacity-60" />
        <span className="absolute left-7 top-4 h-7 w-px rotate-[-50deg] bg-current opacity-50" />
        <span className="absolute right-7 top-4 h-7 w-px rotate-[50deg] bg-current opacity-50" />
        <span className="absolute left-1 top-14 h-px w-10 bg-current opacity-55" />
        <span className="absolute right-1 top-14 h-px w-10 bg-current opacity-55" />
      </div>

      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#eaf8ef]">
        <div className="flex size-14 items-center justify-center rounded-full bg-[#dff3e3] text-[#36a64b]">
          <Check className="size-8 stroke-[3]" />
        </div>
      </div>

      <h2 className="mt-4 text-center text-[2rem] font-black leading-none text-[#071026]">Sesion completada</h2>

      <div className="mt-3 flex items-center justify-center gap-3 text-[#ef6448]">
        <span className="h-px w-10 bg-[#ef6448]/55" />
        <p className="line-clamp-1 text-base font-black">{data.sessionName}</p>
        <span className="h-px w-10 bg-[#ef6448]/55" />
      </div>

      <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-[22px] border border-[#ece7e3] bg-white shadow-[0_12px_32px_rgba(7,16,38,0.08)]">
        <CompletionStoryMetric
          caption="completados"
          icon={<Dumbbell className="size-7 text-[#ef6448]" />}
          label="Ejercicios"
          value={`${data.completedExercises}/${data.totalExercises}`}
        />
        <CompletionStoryMetric
          caption="completado"
          icon={<TrendingUp className="size-7 text-[#36a64b]" />}
          label="Avance"
          value={`${data.completionPercentage}%`}
        />
        <CompletionStoryMetric
          caption="dias"
          icon={<Flame className="size-7 text-[#ef6448]" />}
          label="Racha"
          value={data.streak}
        />
        <CompletionStoryMetric
          caption="registrado"
          icon={<Calendar className="size-7 text-[#ef6448]" />}
          label="Fecha"
          value={dateParts.dayMonth}
          valueClassName="text-xl"
        />
      </div>

      <div className="mt-5 flex items-center gap-4 text-[#ef6448]">
        <span className="h-px flex-1 bg-[#ef6448]/45" />
        <span className="rounded-full border border-[#f4c8bd] bg-[#fff5f2] px-6 py-2 text-sm font-black">#CoraFit</span>
        <span className="h-px flex-1 bg-[#ef6448]/45" />
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
    <div className="flex min-h-20 items-center gap-3 border-b border-r border-[#ece7e3] p-3 last:border-r-0 [&:nth-child(2n)]:border-r-0 [&:nth-child(n+3)]:border-b-0">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#fff0ec]">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#667080]">{label}</p>
        <p className={cn("mt-1 break-words text-2xl font-black leading-none text-[#071026]", valueClassName)}>{value}</p>
        <p className="mt-1 text-xs font-semibold text-[#667080]">{caption}</p>
      </div>
    </div>
  );
}

export function PlaceholderScreen({ token, active, title }: { token: string; active: "progress" | "profile"; title: string }) {
  return (
    <ClientPortalShell token={token} active={active}>
      <section className="px-6 pt-10 md:px-8 lg:px-10">
        <TopBar title={title} backHref={`/c/${encodeURIComponent(token)}/home`} />
        <div className="mt-10 rounded-[24px] border border-[#ece7e3] bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-[#df5b47]">Proximamente</p>
          <h1 className="mt-3 text-2xl font-bold">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#667080]">Esta seccion estara disponible proximamente.</p>
        </div>
      </section>
    </ClientPortalShell>
  );
}

function ClientPortalDesktopNav({
  token,
  active,
  items,
}: {
  token: string;
  active: ClientPortalNavKey;
  items: readonly ClientPortalNavItem[];
}) {
  return (
    <aside className="hidden lg:fixed lg:bottom-0 lg:left-0 lg:top-0 lg:block lg:w-64 lg:border-r lg:border-[#ece7e3] lg:bg-[#fdfdfc] lg:px-6 lg:py-10">
      <BrandMark compact />
      <nav className="mt-12 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return (
            <Link
              className={cn(
                "flex h-12 items-center gap-4 rounded-xl px-4 text-sm font-bold text-[#667080]",
                selected && "bg-[#fff1ee] text-[#df4d3e]",
              )}
              href={item.href(token)}
              key={item.key}
            >
              <Icon className="size-6" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-10 left-6 right-6 rounded-xl border border-[#ece7e3] bg-white p-4 text-sm shadow-sm">
        <p className="font-bold">Acceso seguro</p>
        <p className="mt-2 leading-6 text-[#667080]">Tu informacion esta protegida.</p>
      </div>
    </aside>
  );
}

function ClientPortalBottomNav({
  token,
  active,
  items,
}: {
  token: string;
  active: ClientPortalNavKey;
  items: readonly ClientPortalNavItem[];
}) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full -translate-x-1/2 border-t border-[#ece7e3] bg-white/95 px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
      <div className={cn("grid", items.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return (
            <Link
              className={cn(
                "flex flex-col items-center gap-1 text-xs font-semibold text-[#6d7581]",
                selected && "text-[#df4d3e]",
              )}
              href={item.href(token)}
              key={item.key}
            >
              <Icon className="size-6" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SessionHero({ day, loading, onOpen }: { day: ClientPortalDay | null; loading: boolean; onOpen: () => void }) {
  if (!day?.session) {
    return <EmptyCard className="mt-6" title="Sin sesion para hoy" description="Revisa tu calendario semanal." />;
  }

  return (
    <article className="mt-6 rounded-xl border border-[#f5dfda] bg-[linear-gradient(135deg,#fff8f7,#fff)] p-5 shadow-sm">
      <p className="text-sm font-bold text-[#df4d3e]">Sesion de hoy</p>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{day.session.name}</h2>
          <div className="mt-3 flex gap-4 text-sm font-medium text-[#65717f]">
            <span>{sessionHeroStatus(day)}</span>
            <span>{day.canOpen || day.log ? "Lista para entrenar" : "Sesion programada"}</span>
          </div>
        </div>
        <button
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#df4d3e] text-white shadow-[0_10px_24px_rgba(223,77,62,0.24)]"
          disabled={loading || (!day.canOpen && !day.log)}
          onClick={onOpen}
          type="button"
          aria-label={day.log ? "Continuar sesion" : "Comenzar sesion"}
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : <ChevronRight className="size-7" />}
        </button>
      </div>
    </article>
  );
}

function MiniWeek({ days }: { days: ClientPortalDay[] }) {
  return (
    <div className="mt-4 grid grid-cols-7 gap-2">
      {days.map((day) => {
        const active = day.status === "completed" || day.status === "partially_completed";
        return (
          <div className={cn("rounded-xl py-2 text-center", day.status === "in_progress" && "bg-[#fff1ee]")} key={day.date}>
            <div className="text-xs font-semibold text-[#65717f]">{dayLabels[day.dayOfWeek] ?? day.dayOfWeek.slice(0, 1)}</div>
            <div className="mt-2 text-sm font-bold">{day.date.slice(-2)}</div>
            <div className={cn("mx-auto mt-2 flex size-6 items-center justify-center rounded-full border border-[#c9cdd3]", active && "border-[#df4d3e] bg-[#df4d3e] text-white")}>
              {active ? <Check className="size-4" /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarDayCard({ day, loading, onOpen }: { day: ClientPortalDay; loading: boolean; onOpen: () => void }) {
  const tone = calendarDayTone(day);
  return (
    <div className="rounded-xl border border-[#ece7e3] bg-white shadow-sm">
      <button
        className="flex min-h-20 w-full items-center justify-between p-4 text-left disabled:opacity-70"
        disabled={loading || !day.session}
        onClick={onOpen}
        type="button"
      >
        <div>
          <p className="text-sm font-medium text-[#8b929d]">{longDay(day.dayOfWeek)} {day.date.slice(-2)}</p>
          <h3 className="mt-2 text-base font-bold">{day.session?.name ?? "Descanso"}</h3>
          <CalendarStatusBadge day={day} className="mt-2" />
        </div>
        <div className={cn("flex size-8 items-center justify-center rounded-full border", calendarIconToneClasses[tone])}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : isFinalized(day.status) ? <Check className="size-5" /> : day.session ? <ChevronRight className="size-5" /> : null}
        </div>
      </button>
    </div>
  );
}

function CalendarWeekCell({ day, selected, onSelect }: { day: ClientPortalDay; selected: boolean; onSelect: () => void }) {
  const tone = calendarDayTone(day);

  return (
    <button
      className={cn(
        "flex min-h-40 flex-col items-center rounded-xl border p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        calendarCellToneClasses[tone],
        selected && "border-[#df4d3e] bg-[#fff8f6] shadow-[0_12px_28px_rgba(223,77,62,0.14)]",
      )}
      onClick={onSelect}
      type="button"
    >
      <p className={cn("text-sm font-bold text-[#667080]", selected && "text-[#df4d3e]")}>{shortDay(day.dayOfWeek)}</p>
      <p className={cn("mt-2 text-3xl font-bold text-[#09111f]", selected && "text-[#df4d3e]")}>{day.date.slice(-2)}</p>
      <div className={cn("mt-4 flex size-9 items-center justify-center rounded-full border", calendarIconToneClasses[tone])}>
        <CalendarStatusIcon day={day} />
      </div>
      <span className={cn("mt-3 max-w-full truncate text-xs font-bold", calendarLabelToneClasses[tone])}>{calendarDayShortLabel(day)}</span>
    </button>
  );
}

function CalendarLegend() {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium text-[#667080]">
      <span className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-full bg-[#49ad64] text-white"><Check className="size-3" /></span>Completada</span>
      <span className="flex items-center gap-2"><span className="size-4 rounded-full border-2 border-[#f18a2b]" />Pendiente</span>
      <span className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-full bg-[#df4d3e] text-white"><AlertTriangle className="size-3" /></span>Atrasada</span>
      <span className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-full bg-[#df4d3e] text-white"><ChevronRight className="size-3" /></span>En curso</span>
      <span className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-full bg-[#d8a21b] text-white"><Check className="size-3" /></span>Parcial</span>
      <span className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-full border border-[#d8d1ca] bg-white text-[#667080]"><RotateCcw className="size-3" /></span>Descanso</span>
    </div>
  );
}

function SelectedSessionCard({ day, loading, onOpen }: { day: ClientPortalDay; loading: boolean; onOpen: () => void }) {
  const tone = calendarDayTone(day);

  return (
    <article className="mt-5 grid gap-6 rounded-xl border border-[#ece7e3] bg-white p-6 shadow-sm xl:grid-cols-[1fr_auto] xl:gap-8">
      <div className="flex min-w-0 gap-5">
        <div className={cn("flex size-20 shrink-0 items-center justify-center rounded-2xl border", calendarCellToneClasses[tone])}>
          <Calendar className={cn("size-9", calendarLabelToneClasses[tone])} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#667080]">{formatFullDate(day.date, day.dayOfWeek)}</p>
          <h2 className="mt-2 truncate text-2xl font-bold text-[#09111f]">{day.session?.name ?? "Descanso"}</h2>
          <CalendarStatusBadge day={day} className="mt-3" />
        </div>
      </div>
      {day.session ? (
        <div className="flex min-w-0 items-center border-t border-[#ece7e3] pt-6 xl:min-w-64 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
          <button className={cn("flex h-14 w-full items-center justify-center gap-3 rounded-xl px-5 text-base font-bold", calendarButtonToneClasses[tone])} disabled={loading} onClick={onOpen} type="button">
            {loading ? <Loader2 className="size-5 animate-spin" /> : calendarDayActionLabel(day)}
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
      <h2 className="text-xl font-bold text-[#09111f]">Proximos dias</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-[#ece7e3] bg-white shadow-sm">
        {days.map((day) => (
          <div className="grid grid-cols-[4rem_1fr_auto] items-center gap-4 border-b border-[#ece7e3] px-4 py-4 last:border-b-0" key={day.date}>
            <div className="rounded-xl bg-[#f4f1ef] px-3 py-2 text-center">
              <p className="text-xs font-bold text-[#667080]">{shortDay(day.dayOfWeek)}</p>
              <p className="text-lg font-bold text-[#09111f]">{day.date.slice(-2)}</p>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-[#09111f]">{day.session?.name ?? "Descanso"}</h3>
              <p className="mt-1 text-sm font-medium text-[#667080]">{day.session ? "Proxima sesion programada." : "Dia de recuperacion."}</p>
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
  total,
}: {
  completedCount: number;
  finalizing: boolean;
  onFinalize: () => void;
  onSave: () => void;
  pendingCount: number;
  total: number;
}) {
  const progress = total ? (completedCount / total) * 100 : 0;

  return (
    <aside className="hidden lg:sticky lg:top-8 lg:block">
      <div className="rounded-xl border border-[#ece7e3] bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-[#667080]">Progreso actual</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-[#09111f]">{completedCount}/{total}</p>
            <p className="mt-1 text-sm font-medium text-[#667080]">ejercicios completados</p>
          </div>
          <span className="rounded-full bg-[#fff0ed] px-3 py-1 text-xs font-bold text-[#df4d3e]">{Math.round(progress)}%</span>
        </div>
        <div className="mt-5 h-2 rounded-full bg-[#f0eeee]">
          <div className="h-2 rounded-full bg-[#df4d3e]" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-4 text-sm font-medium text-[#667080]">
          {pendingCount > 0 ? `${pendingCount} ejercicios pendientes.` : "Todos los ejercicios estan listos para finalizar."}
        </p>
        <div className="mt-6 space-y-3">
          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#df5b47] text-sm font-bold text-[#df5b47]"
            onClick={onSave}
            type="button"
          >
            <Home className="size-4" /> Guardar y salir
          </button>
          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#df4d3e] text-sm font-bold text-white shadow-[0_10px_24px_rgba(223,77,62,0.22)] disabled:opacity-60"
            disabled={finalizing}
            onClick={onFinalize}
            type="button"
          >
            {finalizing ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Finalizar sesion
          </button>
        </div>
      </div>
    </aside>
  );
}

function ExerciseCard({
  exercise,
  index,
  completed,
  loading,
  readOnly = false,
  onComplete,
  onUseAlternative,
  selectedAlternativeId,
}: {
  exercise: ClientSessionLog["snapshotData"]["exercises"][number];
  index: number;
  completed: boolean;
  loading: boolean;
  readOnly?: boolean;
  onComplete: () => void;
  onUseAlternative: (alternativeId: string) => void;
  selectedAlternativeId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="rounded-xl border border-[#ece7e3] bg-white p-4 shadow-sm">
      <div className="flex min-h-16 items-center gap-4">
        <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold", completed ? "bg-[#49ad64] text-white" : "bg-[#fff0ed] text-[#df4d3e]")}>
          {index + 1}
        </div>
        <button className="min-w-0 flex-1 text-left" onClick={() => setExpanded((current) => !current)} type="button">
          <h3 className="truncate text-base font-bold">{exercise.exercise.name}</h3>
          <p className="mt-2 text-sm font-medium text-[#667080]">
            {exercise.sets ?? "-"} series x {exercise.reps} reps
          </p>
          <p className="mt-1 text-sm font-medium text-[#667080]">{exercise.restSeconds ?? 0} seg descanso</p>
        </button>
        {readOnly ? (
          <div className="rounded-lg bg-[#f4f1ef] px-3 py-2 text-xs font-bold text-[#667080]">Lectura</div>
        ) : (
          <button
            className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border border-[#c9cdd3]", completed && "border-[#49ad64] bg-[#49ad64] text-white")}
            disabled={completed || loading}
            onClick={onComplete}
            type="button"
            aria-label="Completar ejercicio"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : completed ? <Check className="size-5" /> : null}
          </button>
        )}
      </div>
      {expanded ? (
        <ExerciseDetails
          exercise={exercise}
          loading={loading}
          onUseAlternative={onUseAlternative}
          readOnly={readOnly}
          selectedAlternativeId={selectedAlternativeId}
        />
      ) : null}
    </article>
  );
}

function ExerciseDetails({
  exercise,
  loading,
  onUseAlternative,
  readOnly,
  selectedAlternativeId,
}: {
  exercise: ClientSessionLog["snapshotData"]["exercises"][number];
  loading: boolean;
  onUseAlternative: (alternativeId: string) => void;
  readOnly: boolean;
  selectedAlternativeId: string | null;
}) {
  return (
    <div className="mt-4 space-y-4 border-t border-[#f0eeee] pt-4">
      <DetailBlock label="Nota del coach" value={exercise.coachNote} />
      <DetailBlock label="Instrucciones" value={exercise.exercise.instructions} />
      <DetailBlock label="Recomendaciones" value={exercise.exercise.recommendations} />
      <div>
        <p className="text-xs font-bold uppercase text-[#8b929d]">Media</p>
        {exercise.exercise.mediaUrl ? (
          <a
            className="mt-2 inline-flex rounded-lg border border-[#ece7e3] px-3 py-2 text-sm font-bold text-[#df4d3e]"
            href={exercise.exercise.mediaUrl}
            rel="noreferrer"
            target="_blank"
          >
            Ver {exercise.exercise.mediaType === "video_url" ? "video" : "media"}
          </a>
        ) : (
          <p className="mt-2 text-sm text-[#8b929d]">Sin media adjunta.</p>
        )}
      </div>
      {exercise.alternatives.length ? (
        <div>
          <p className="text-xs font-bold uppercase text-[#8b929d]">Alternativas</p>
          <div className="mt-2 space-y-2">
            {exercise.alternatives.map((alternative) => (
              <div className="rounded-lg border border-[#ece7e3] p-3" key={alternative.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{alternative.exercise.name}</p>
                    {alternative.note ? <p className="mt-1 text-sm text-[#667080]">{alternative.note}</p> : null}
                  </div>
                  {readOnly ? null : (
                    <button
                      className="shrink-0 rounded-lg border border-[#df5b47] px-3 py-2 text-xs font-bold text-[#df5b47] disabled:opacity-60"
                      disabled={loading || selectedAlternativeId === alternative.id}
                      onClick={() => onUseAlternative(alternative.id)}
                      type="button"
                    >
                      {selectedAlternativeId === alternative.id ? "En uso" : "Usar alternativa"}
                    </button>
                  )}
                </div>
                <DetailBlock compact label="Instrucciones" value={alternative.exercise.instructions} />
                <DetailBlock compact label="Recomendaciones" value={alternative.exercise.recommendations} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailBlock({ label, value, compact }: { label: string; value: string | null; compact?: boolean }) {
  if (!value) return null;
  return (
    <div className={compact ? "mt-3" : undefined}>
      <p className="text-xs font-bold uppercase text-[#8b929d]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[#4e5968]">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, caption, icon, tone }: { label: string; value: ReactNode; caption: string; icon?: ReactNode; tone?: "green" | "orange" }) {
  return (
    <div className="min-h-24 rounded-xl border border-[#ece7e3] bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold text-[#667080]">{label}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-2xl font-bold">{value}</span>
        {icon ?? <span className={cn("flex size-7 items-center justify-center rounded-full border", tone === "green" ? "border-[#49ad64] text-[#49ad64]" : "border-[#f18a2b] text-[#f18a2b]")}><Check className="size-4" /></span>}
      </div>
      <p className="mt-1 text-xs font-medium text-[#667080]">{caption}</p>
    </div>
  );
}

function SectionHeader({ title, href, label = "Ver mas" }: { title: string; href: string; label?: string }) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <h2 className="text-lg font-bold">{title}</h2>
      <Link className="text-sm font-bold text-[#df4d3e]" href={href}>{label}</Link>
    </div>
  );
}

function TopBar({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="flex items-center justify-between">
      <Link className="rounded-full p-2" href={backHref} aria-label="Volver">
        <ArrowLeft className="size-6" />
      </Link>
      <h1 className="max-w-[260px] truncate text-center text-lg font-bold">{title}</h1>
      <button className="rounded-full p-2" type="button" aria-label="Mas opciones">
        <MoreHorizontal className="size-6" />
      </button>
    </header>
  );
}

function WeekButton({ direction, date, token }: { direction: "prev" | "next"; date: string; token: string }) {
  const target = addDays(date, direction === "prev" ? -7 : 7);
  return (
    <Link className="flex size-11 items-center justify-center rounded-full bg-white" href={`/c/${encodeURIComponent(token)}/calendar?date=${target}`}>
      {direction === "prev" ? <ChevronLeft className="size-6" /> : <ChevronRight className="size-6" />}
    </Link>
  );
}

function EmptyCard({ title, description, className }: { title: string; description?: string; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-[#ece7e3] bg-white p-5 shadow-sm", className)}>
      <p className="text-base font-bold">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-[#667080]">{description}</p> : null}
    </div>
  );
}

function ScreenState({ title, description, compact }: { title: string; description?: string; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 text-center", compact ? "py-10" : "min-h-screen")}>
      <Loader2 className="mb-4 size-8 animate-spin text-[#df4d3e]" />
      <h1 className="text-xl font-bold">{title}</h1>
      {description ? <p className="mt-2 text-sm leading-6 text-[#667080]">{description}</p> : null}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return <div className="mt-4 rounded-xl border border-[#f2c8c0] bg-[#fff4f1] p-3 text-sm font-semibold text-[#9f3529]">{message}</div>;
}

function BrandMark({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center text-[#df4d3e]">
        <Dumbbell className="size-5 rotate-[-25deg]" />
      </div>
      {compact ? <span className="text-2xl font-bold">CoraFit</span> : null}
    </div>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function homeStateTitle(state: ClientPortalHome["state"]) {
  if (state === "no_plan") return "Aun no tienes un plan asignado";
  if (state === "not_started") return "Tu plan aun no inicia";
  if (state === "plan_finished") return "Tu plan ya termino";
  return "Sin sesiones esta semana";
}

function calendarStateTitle(state?: ClientPortalCalendar["state"]) {
  if (state === "no_plan") return "Aun no tienes un plan asignado";
  if (state === "not_started") return "Tu plan aun no inicia";
  if (state === "plan_finished" || state === "outside_plan") return "Tu plan ya termino";
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

function formatCompletionDateParts(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return {
    dayMonth: parsed.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }).replace(".", ""),
    year: parsed.toLocaleDateString("es-MX", { year: "numeric" }),
  };
}

function buildCompletionCardSvg(data: CompletionCard) {
  const sessionName = escapeSvgText(truncateText(data.sessionName, 34));
  const dateParts = formatCompletionDateParts(data.scheduledDate);
  const dateDayMonth = escapeSvgText(dateParts.dayMonth);
  const percentage = escapeSvgText(String(data.completionPercentage));
  const completed = escapeSvgText(String(data.completedExercises));
  const total = escapeSvgText(String(data.totalExercises));
  const streak = escapeSvgText(String(data.streak));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1360" viewBox="0 0 1080 1360" role="img" aria-label="CoraFit sesion completada">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="30" stdDeviation="28" flood-color="#000000" flood-opacity="0.34"/></filter>
  </defs>
  <rect x="24" y="24" width="1032" height="1312" rx="86" fill="#ffffff" stroke="#f2ece7" stroke-width="2" filter="url(#shadow)"/>
  <line x1="540" y1="80" x2="540" y2="155" stroke="#a8d8ae" stroke-width="2" opacity="0.65"/>
  <line x1="430" y1="125" x2="380" y2="75" stroke="#a8d8ae" stroke-width="2" opacity="0.55"/>
  <line x1="650" y1="125" x2="700" y2="75" stroke="#a8d8ae" stroke-width="2" opacity="0.55"/>
  <line x1="300" y1="245" x2="405" y2="245" stroke="#a8d8ae" stroke-width="2" opacity="0.55"/>
  <line x1="675" y1="245" x2="780" y2="245" stroke="#a8d8ae" stroke-width="2" opacity="0.55"/>
  <circle cx="540" cy="205" r="105" fill="#eaf8ef"/>
  <circle cx="540" cy="205" r="72" fill="#dff3e3"/>
  <path d="M493 205 L526 238 L596 154" fill="none" stroke="#36a64b" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="540" y="445" fill="#071026" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="84" font-weight="900" text-anchor="middle">Sesion completada</text>
  <line x1="285" y1="525" x2="405" y2="525" stroke="#ef6448" stroke-width="3" opacity="0.65"/>
  <text x="540" y="542" fill="#ef6448" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="900" text-anchor="middle">${sessionName}</text>
  <line x1="675" y1="525" x2="795" y2="525" stroke="#ef6448" stroke-width="3" opacity="0.65"/>
  <rect x="90" y="630" width="900" height="420" rx="40" fill="#ffffff" stroke="#ece7e3" stroke-width="2"/>
  <line x1="540" y1="630" x2="540" y2="1050" stroke="#ece7e3" stroke-width="2"/>
  <line x1="90" y1="840" x2="990" y2="840" stroke="#ece7e3" stroke-width="2"/>
  <circle cx="205" cy="735" r="55" fill="#fff0ec"/>
  <path d="M168 735 H182 M228 735 H242 M182 720 V750 M196 712 V758 M214 712 V758 M228 720 V750 M196 735 H214" fill="none" stroke="#ef6448" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="320" y="710" fill="#667080" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">Ejercicios</text>
  <text x="320" y="780" fill="#071026" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="58" font-weight="900">${completed}/${total}</text>
  <text x="320" y="830" fill="#667080" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">completados</text>
  <circle cx="655" cy="735" r="55" fill="#eaf8ef"/>
  <path d="M630 752 L650 732 L666 746 L690 720 M670 720 H690 V740" fill="none" stroke="#5cb76b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="770" y="710" fill="#667080" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">Avance</text>
  <text x="770" y="780" fill="#071026" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="58" font-weight="900">${percentage}%</text>
  <text x="770" y="830" fill="#667080" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">completado</text>
  <circle cx="205" cy="945" r="55" fill="#fff0ec"/>
  <path d="M207 980 C185 976 174 959 179 941 C183 925 196 918 197 899 C214 912 221 924 218 938 C225 933 230 926 231 917 C245 933 250 949 244 963 C237 978 222 984 207 980 Z" fill="none" stroke="#ef6448" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="320" y="920" fill="#667080" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">Racha</text>
  <text x="320" y="990" fill="#071026" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="58" font-weight="900">${streak}</text>
  <text x="320" y="1040" fill="#667080" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">dias</text>
  <circle cx="655" cy="945" r="55" fill="#fff0ec"/>
  <rect x="625" y="918" width="60" height="62" rx="10" fill="none" stroke="#ef6448" stroke-width="8"/>
  <path d="M625 938 H685 M640 906 V928 M670 906 V928" fill="none" stroke="#ef6448" stroke-width="8" stroke-linecap="round"/>
  <text x="770" y="920" fill="#667080" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">Fecha</text>
  <text x="770" y="990" fill="#071026" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="48" font-weight="900">${dateDayMonth}</text>
  <text x="770" y="1040" fill="#667080" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">registrado</text>
  <line x1="90" y1="1190" x2="350" y2="1190" stroke="#ef6448" stroke-width="2" opacity="0.55"/>
  <rect x="390" y="1147" width="300" height="86" rx="43" fill="#fff5f2" stroke="#f4c8bd"/>
  <text x="540" y="1203" fill="#ef6448" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="900" text-anchor="middle">#CoraFit</text>
  <line x1="730" y1="1190" x2="990" y2="1190" stroke="#ef6448" stroke-width="2" opacity="0.55"/>
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
  const formatted = parsed.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
  return `${longDay(dayOfWeek)} ${formatted}`;
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
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

function calendarDayShortLabel(day: ClientPortalDay) {
  if (!day.session) return "Descanso";
  if (day.status === "overdue") return "Atrasada";
  if (day.status === "completed") return "Completada";
  if (day.status === "partially_completed") return "Parcial";
  if (day.status === "opened" || day.status === "in_progress") return "En curso";
  return day.canOpen ? "Pendiente" : "Proxima";
}

function CalendarStatusIcon({ day }: { day: ClientPortalDay }) {
  if (isFinalized(day.status)) return <Check className="size-5" />;
  if (!day.session) return <RotateCcw className="size-5" />;
  if (day.status === "overdue") return <AlertTriangle className="size-5" />;
  if (day.status === "opened" || day.status === "in_progress") return <ChevronRight className="size-5" />;
  return null;
}

function CalendarStatusBadge({ day, className }: { day: ClientPortalDay; className?: string }) {
  const tone = calendarDayTone(day);
  return (
    <span className={cn("inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-bold", calendarBadgeToneClasses[tone], className)}>
      {statusLabels[day.status]}
    </span>
  );
}

function sessionHeroStatus(day: ClientPortalDay) {
  if (day.log?.status) return statusLabels[day.log.status];
  if (day.status && day.status !== "pending") return statusLabels[day.status];
  return "Sesion programada";
}

function calculateVisibleSessionStreak(days: ClientPortalDay[], today?: string) {
  const sortedDays = [...days].sort((left, right) => left.date.localeCompare(right.date));
  const completedIndexes = sortedDays
    .map((day, index) => (isFinalized(day.status) ? index : -1))
    .filter((index) => index >= 0);

  if (!completedIndexes.length) return 0;

  const todayIndex = today ? sortedDays.findIndex((day) => day.date === today) : -1;
  const anchorIndex =
    todayIndex >= 0 && isFinalized(sortedDays[todayIndex]?.status)
      ? todayIndex
      : (completedIndexes.filter((index) => todayIndex < 0 || index <= todayIndex).at(-1) ?? completedIndexes.at(-1));

  if (anchorIndex === undefined) return 0;

  let streak = 0;
  for (let index = anchorIndex; index >= 0; index -= 1) {
    const day = sortedDays[index];
    if (!day?.session) continue;
    if (!isFinalized(day.status)) break;
    streak += 1;
  }

  return streak;
}

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) return caught.message;
  return fallback;
}
