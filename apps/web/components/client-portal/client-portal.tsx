"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Home,
  Loader2,
  MoreHorizontal,
  Pause,
  Plus,
  RotateCcw,
  TrendingUp,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clientPortalRequest,
  verifyPin,
  type ClientPortalCalendar,
  type ClientPortalDay,
  type ClientPortalHome,
  type ClientPortalStatus,
  type ClientSessionLog,
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

export function ClientPortalShell({
  token,
  active,
  children,
}: {
  token: string;
  active?: "home" | "calendar" | "progress" | "profile";
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f8f7f5] text-[#121722]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#fdfdfc] shadow-[0_22px_80px_rgba(18,23,34,0.10)]">
        <div className="min-h-screen pb-24">{children}</div>
        {active ? <ClientPortalBottomNav token={token} active={active} /> : null}
      </div>
    </main>
  );
}

export function PinAccessScreen({ token }: { token: string }) {
  const router = useRouter();
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

  function press(value: string) {
    if (state === "loading") return;
    const nextPin = `${pin}${value}`.slice(0, digits);
    setPin(nextPin);
    if (nextPin.length === digits) {
      void submitPin(nextPin);
    }
  }

  return (
    <ClientPortalShell token={token}>
      <section className="flex min-h-screen flex-col px-8 py-12">
        <div className="mb-12">
          <BrandMark />
          <h1 className="mt-10 text-3xl font-bold">CoraFit</h1>
          <p className="mt-10 max-w-[250px] text-base font-medium leading-7 text-[#4e5968]">
            Ingresa tu PIN para acceder a tu portal
          </p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: digits }).map((_, index) => (
            <div
              className={cn(
                "flex h-12 items-center justify-center rounded-xl border border-[#ece7e3] bg-white text-lg font-bold shadow-sm",
                pin[index] && "border-[#df5b47] bg-[#fff3f0]",
              )}
              key={index}
            >
              {pin[index] ? "•" : ""}
            </div>
          ))}
        </div>
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
        <div className="mt-auto grid grid-cols-3 gap-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((key) =>
            key === "" ? (
              <div key="empty" />
            ) : (
              <button
                className="flex h-14 items-center justify-center rounded-xl border border-[#ece7e3] bg-white text-2xl font-bold shadow-sm active:scale-[0.98]"
                disabled={state === "loading"}
                key={key}
                onClick={() => (key === "back" ? setPin((current) => current.slice(0, -1)) : press(key))}
                type="button"
              >
                {key === "back" ? "⌫" : key}
              </button>
            ),
          )}
        </div>
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
    Promise.all([
      clientPortalRequest<ClientPortalHome>(`/client-portal/${encodeURIComponent(token)}/home`),
      clientPortalRequest<ClientPortalCalendar>(`/client-portal/${encodeURIComponent(token)}/calendar`),
    ])
      .then(([homeResult, calendarResult]) => {
        if (alive) {
          setData(homeResult);
          setCalendar(calendarResult);
        }
      })
      .catch((caught) => {
        if (alive) setError(errorMessage(caught, "No pudimos cargar tu portal."));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
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

  return (
    <ClientPortalShell token={token} active="home">
      <section className="px-6 pt-9">
        <header className="flex items-center justify-between">
          <BrandMark compact />
          <button className="rounded-full p-2 text-[#111827]" type="button" aria-label="Notificaciones">
            <BellIcon />
          </button>
        </header>
        <h1 className="mt-8 text-3xl font-bold tracking-normal">Hola, {firstName(data.client.name)}</h1>
        <p className="mt-2 text-base text-[#667080]">Listo para tu entrenamiento de hoy.</p>
        <SessionHero day={actionableSession} loading={opening} onOpen={() => void openSession(actionableSession)} />
        <SectionHeader title="Tu semana" href={`/c/${encodeURIComponent(token)}/calendar`} />
        {calendar?.calendar ? <MiniWeek days={calendar.calendar.days} /> : <EmptyCard title={homeStateTitle(data.state)} />}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <MetricCard label="Completadas" value={summary?.completedSessions ?? 0} caption="esta semana" tone="green" />
          <MetricCard label="Racha actual" value={summary?.openedSessions ?? 0} caption="dias" icon={<Flame className="size-6 text-[#f18a2b]" />} />
          <MetricCard label="Por completar" value={summary?.pendingSessions ?? 0} caption="esta semana" tone="orange" />
        </div>
        <SectionHeader title="Progreso rapido" href={`/c/${encodeURIComponent(token)}/progress`} />
        <WeightPreview />
        <SectionHeader title="Fotos de progreso" href={`/c/${encodeURIComponent(token)}/progress`} label="Ver todas" />
        <ProgressPhotos />
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

  return (
    <ClientPortalShell token={token} active="calendar">
      <section className="px-6 pt-8">
        <TopBar title="Calendario" backHref={`/c/${encodeURIComponent(token)}/home`} />
        {loading ? <ScreenState title="Cargando calendario" compact /> : null}
        {error ? <InlineError message={error} /> : null}
        {data?.calendar ? (
          <>
            <div className="mt-5 flex items-center gap-3">
              <WeekButton direction="prev" date={data.calendar.weekStartDate} token={token} />
              <div className="flex-1 rounded-xl border border-[#ece7e3] bg-white py-3 text-center text-sm font-bold shadow-sm">
                {formatDate(data.calendar.weekStartDate)} - {formatDate(data.calendar.weekEndDate)}
              </div>
              <WeekButton direction="next" date={data.calendar.weekEndDate} token={token} />
            </div>
            <div className="mt-5 space-y-3">
              {data.calendar.days.map((day) => (
                <CalendarDayCard
                  day={day}
                  key={day.date}
                  loading={openingDate === day.date}
                  onOpen={() => void open(day)}
                />
              ))}
            </div>
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

  const load = useCallback(() => {
    clientPortalRequest<ClientSessionLog>(
      `/client-portal/${encodeURIComponent(token)}/session-logs/${encodeURIComponent(sessionLogId)}`,
    )
      .then(setLog)
      .catch((caught) => setError(errorMessage(caught, "No pudimos cargar la sesion.")))
      .finally(() => setLoading(false));
  }, [sessionLogId, token]);

  useEffect(load, [load]);

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

  async function finalize() {
    setFinalizing(true);
    try {
      await clientPortalRequest<ClientSessionLog>(
        `/client-portal/${encodeURIComponent(token)}/session-logs/${encodeURIComponent(sessionLogId)}/finalize`,
        { method: "POST" },
      );
      router.push(`/c/${encodeURIComponent(token)}/session/${encodeURIComponent(sessionLogId)}/completed`);
    } catch (caught) {
      setError(errorMessage(caught, "Completa al menos un ejercicio antes de finalizar."));
    } finally {
      setFinalizing(false);
    }
  }

  if (loading) return <ClientPortalShell token={token}><ScreenState title="Cargando sesion" /></ClientPortalShell>;
  if (!log) return <ClientPortalShell token={token}><ScreenState title="Sesion no disponible" description={error ?? undefined} /></ClientPortalShell>;

  const completed = log.snapshotData.progress?.completedExerciseIds ?? [];
  const total = log.snapshotData.exercises.length;
  const progressLabel = `${completed.length} / ${total}`;

  if (isFinalized(log.status)) {
    router.replace(`/c/${encodeURIComponent(token)}/session/${encodeURIComponent(sessionLogId)}/completed`);
  }

  return (
    <ClientPortalShell token={token}>
      <section className="px-5 pt-8">
        <TopBar title={log.snapshotData.session.name} backHref={`/c/${encodeURIComponent(token)}/home`} />
        {error ? <InlineError message={error} /> : null}
        <div className="mt-6 rounded-xl border border-[#ece7e3] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>Progreso de la sesion</span>
            <span>{progressLabel}</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-[#f0eeee]">
            <div className="h-2 rounded-full bg-[#df4d3e]" style={{ width: `${total ? (completed.length / total) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {log.snapshotData.exercises.map((exercise, index) => (
            <ExerciseCard
              completed={completed.includes(exercise.sessionExerciseId)}
              exercise={exercise}
              index={index}
              key={exercise.sessionExerciseId}
              loading={busyId === exercise.sessionExerciseId}
              onComplete={() => void complete(exercise.sessionExerciseId)}
            />
          ))}
        </div>
        <button className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#ece7e3] bg-white text-sm font-bold" type="button">
          Ver ejercicios restantes ({Math.max(total - completed.length, 0)}) <ChevronDown className="size-4" />
        </button>
        <div className="sticky bottom-0 -mx-5 mt-8 grid grid-cols-2 gap-3 border-t border-[#ece7e3] bg-white/95 px-5 py-5 backdrop-blur">
          <button className="flex h-14 items-center justify-center gap-2 rounded-xl border border-[#df5b47] text-sm font-bold text-[#df5b47]" type="button">
            <Pause className="size-4" /> Pausar sesion
          </button>
          <button
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-[#df4d3e] text-sm font-bold text-white shadow-[0_10px_24px_rgba(223,77,62,0.22)] disabled:opacity-60"
            disabled={finalizing}
            onClick={() => void finalize()}
            type="button"
          >
            {finalizing ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Finalizar sesion
          </button>
        </div>
      </section>
    </ClientPortalShell>
  );
}

export function CompletionCardScreen({ token, sessionLogId }: { token: string; sessionLogId: string }) {
  const [data, setData] = useState<CompletionCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clientPortalRequest<CompletionCard>(
      `/client-portal/${encodeURIComponent(token)}/session-logs/${encodeURIComponent(sessionLogId)}/completion-card`,
    )
      .then(setData)
      .catch((caught) => setError(errorMessage(caught, "No pudimos cargar tu logro.")));
  }, [sessionLogId, token]);

  return (
    <ClientPortalShell token={token}>
      <section className="flex min-h-screen flex-col px-6 py-10">
        <BrandMark />
        {error ? <InlineError message={error} /> : null}
        {data ? (
          <div className="mt-12 rounded-[28px] border border-[#f0dfda] bg-white p-7 text-center shadow-[0_18px_50px_rgba(18,23,34,0.08)]">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#eaf8ef] text-[#49ad64]">
              <Check className="size-10" />
            </div>
            <h1 className="mt-7 text-3xl font-bold">Sesion completada</h1>
            <p className="mt-3 text-base text-[#667080]">{data.sessionName}</p>
            <div className="mt-7 grid grid-cols-3 gap-3">
              <MetricCard label="Ejercicios" value={`${data.completedExercises}/${data.totalExercises}`} caption="completados" />
              <MetricCard label="Avance" value={`${data.completionPercentage}%`} caption="total" />
              <MetricCard label="Racha" value={data.streak} caption="dias" icon={<Flame className="size-5 text-[#f18a2b]" />} />
            </div>
            <p className="mt-7 text-sm leading-6 text-[#667080]">Buen trabajo. Tu constancia ya quedo registrada para tu coach.</p>
          </div>
        ) : (
          <ScreenState title="Preparando tu logro" compact />
        )}
        <div className="mt-auto space-y-3 pt-10">
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

export function PlaceholderScreen({ token, active, title }: { token: string; active: "progress" | "profile"; title: string }) {
  return (
    <ClientPortalShell token={token} active={active}>
      <section className="px-6 pt-10">
        <TopBar title={title} backHref={`/c/${encodeURIComponent(token)}/home`} />
        <div className="mt-10 rounded-[24px] border border-[#ece7e3] bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-[#df5b47]">Proximamente</p>
          <h1 className="mt-3 text-2xl font-bold">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#667080]">
            Esta seccion visual ya esta lista como punto de entrada. Se conectara cuando exista API para estos datos.
          </p>
        </div>
      </section>
    </ClientPortalShell>
  );
}

function ClientPortalBottomNav({ token, active }: { token: string; active: "home" | "calendar" | "progress" | "profile" }) {
  const items = [
    { key: "home", label: "Inicio", href: `/c/${encodeURIComponent(token)}/home`, icon: Home },
    { key: "calendar", label: "Calendario", href: `/c/${encodeURIComponent(token)}/calendar`, icon: Calendar },
    { key: "progress", label: "Progreso", href: `/c/${encodeURIComponent(token)}/progress`, icon: TrendingUp },
    { key: "profile", label: "Perfil", href: `/c/${encodeURIComponent(token)}/profile`, icon: User },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] border-t border-[#ece7e3] bg-white/95 px-6 py-3 backdrop-blur">
      <div className="grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return (
            <Link
              className={cn(
                "flex flex-col items-center gap-1 text-xs font-semibold text-[#6d7581]",
                selected && "text-[#df4d3e]",
              )}
              href={item.href}
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
            <span>50 min</span>
            <span>7 ejercicios</span>
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
  const active = day.status === "completed" || day.status === "partially_completed";
  return (
    <button
      className="flex min-h-20 w-full items-center justify-between rounded-xl border border-[#ece7e3] bg-white p-4 text-left shadow-sm disabled:opacity-70"
      disabled={loading || (!day.canOpen && !day.log)}
      onClick={onOpen}
      type="button"
    >
      <div>
        <p className="text-sm font-medium text-[#8b929d]">{longDay(day.dayOfWeek)} {day.date.slice(-2)}</p>
        <h3 className="mt-2 text-base font-bold">{day.session?.name ?? "Descanso"}</h3>
        <p className="mt-1 text-xs font-semibold text-[#667080]">{statusLabels[day.status]}</p>
      </div>
      <div className={cn("flex size-8 items-center justify-center rounded-full border border-[#c9cdd3]", active && "border-[#49ad64] bg-[#49ad64] text-white")}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : active ? <Check className="size-5" /> : null}
      </div>
    </button>
  );
}

function ExerciseCard({
  exercise,
  index,
  completed,
  loading,
  onComplete,
}: {
  exercise: ClientSessionLog["snapshotData"]["exercises"][number];
  index: number;
  completed: boolean;
  loading: boolean;
  onComplete: () => void;
}) {
  const selectedAlternative = exercise.alternatives[0];
  return (
    <article className="flex min-h-24 items-center gap-4 rounded-xl border border-[#ece7e3] bg-white p-4 shadow-sm">
      <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold", completed ? "bg-[#49ad64] text-white" : "bg-[#fff0ed] text-[#df4d3e]")}>
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-bold">{exercise.exercise.name}</h3>
        <p className="mt-2 text-sm font-medium text-[#667080]">
          {exercise.sets ?? "-"} series x {exercise.reps} reps
        </p>
        <p className="mt-1 text-sm font-medium text-[#667080]">{exercise.restSeconds ?? 0} seg descanso</p>
        {selectedAlternative ? (
          <p className="mt-2 text-xs font-semibold text-[#df5b47]">Alternativa: {selectedAlternative.exercise.name}</p>
        ) : null}
      </div>
      <button
        className={cn("flex size-8 shrink-0 items-center justify-center rounded-full border border-[#c9cdd3]", completed && "border-[#49ad64] bg-[#49ad64] text-white")}
        disabled={completed || loading}
        onClick={onComplete}
        type="button"
        aria-label="Completar ejercicio"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : completed ? <Check className="size-5" /> : null}
      </button>
    </article>
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

function WeightPreview() {
  return (
    <div className="mt-4 flex items-center gap-4 rounded-xl border border-[#ece7e3] bg-white p-4 shadow-sm">
      <div className="w-32">
        <p className="text-sm font-semibold text-[#667080]">Peso corporal</p>
        <p className="mt-1 text-xs text-[#667080]">Ultimo registro</p>
        <p className="mt-3 text-2xl font-bold">72.5 kg</p>
        <p className="mt-1 text-sm text-[#667080]">Hace 2 dias</p>
      </div>
      <div className="h-20 flex-1 rounded-lg bg-[linear-gradient(180deg,#fff,#fff4f1)]">
        <svg className="h-full w-full" viewBox="0 0 180 80" role="img" aria-label="Tendencia de peso">
          <path d="M3 24 L25 35 L48 39 L70 48 L92 44 L113 54 L135 48 L158 58 L178 58" fill="none" stroke="#df4d3e" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

function ProgressPhotos() {
  return (
    <div className="mt-4 grid grid-cols-4 gap-3">
      {["Frente", "Perfil", "Espalda"].map((label) => (
        <div className="flex aspect-square items-end justify-center rounded-lg bg-[#e4ddd7] p-2 text-[10px] font-bold text-[#766b62]" key={label}>
          {label}
        </div>
      ))}
      <Link className="flex aspect-square flex-col items-center justify-center rounded-lg border border-dashed border-[#d5d1cc] bg-white text-xs font-semibold text-[#667080]" href="#">
        <Plus className="mb-2 size-6" /> Nueva foto
      </Link>
    </div>
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

function BellIcon() {
  return (
    <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0" />
    </svg>
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

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function isFinalized(status?: ClientPortalStatus) {
  return status === "completed" || status === "partially_completed";
}

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) return caught.message;
  return fallback;
}
