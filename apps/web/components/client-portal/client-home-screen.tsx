"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { CoraFitApiError } from "@/lib/api/authenticated-request";
import {
  clientPortalRequest,
  type ClientPortalDay,
  type ClientPortalHome,
  type ClientSessionLog,
} from "@/lib/client-portal/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientPortalShell } from "./client-portal-shell";
import {
  buildClientHomeViewModel,
  getClientHomeSessionAction,
  type ClientHomeHeroView,
  type ClientHomeNextActivityView,
  type ClientHomePlanView,
  type ClientHomeWeekDayView,
  type ClientHomeWeekView,
} from "./client-home-state";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

export function ClientHomeScreen({ token }: { token: string }) {
  const router = useRouter();
  const [data, setData] = useState<ClientPortalHome | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionActionError, setSessionActionError] = useState<string | null>(
    null,
  );
  const [isOpeningSession, setIsOpeningSession] = useState(false);

  useEffect(() => {
    let alive = true;

    clientPortalRequest<ClientPortalHome>(
      `/client-portal/${encodeURIComponent(token)}/home`,
    )
      .then((result) => {
        if (!alive) return;
        setData(result);
      })
      .catch((caught) => {
        if (!alive) return;
        setLoadError(errorMessage(caught, "No pudimos cargar tu portal."));
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  async function retryLoadHome() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await clientPortalRequest<ClientPortalHome>(
        `/client-portal/${encodeURIComponent(token)}/home`,
      );
      setData(result);
    } catch (caught) {
      setLoadError(errorMessage(caught, "No pudimos cargar tu portal."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSessionAction(day: ClientPortalDay | null) {
    const action = getClientHomeSessionAction({ day, token });
    setSessionActionError(null);

    if (action.kind === "none") return;
    if (action.kind === "existing-log" || action.kind === "preview") {
      router.push(action.href);
      return;
    }
    if (!day?.session || !day.canOpen) return;

    setIsOpeningSession(true);
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
      setSessionActionError(
        errorMessage(caught, "No pudimos abrir la sesión."),
      );
    } finally {
      setIsOpeningSession(false);
    }
  }

  const view = data ? buildClientHomeViewModel(data) : null;

  return (
    <ClientPortalShell
      token={token}
      active="home"
      hideCalendarNav={view?.hideCalendarNav}
    >
      <section className="px-4 pt-5 md:px-8 lg:px-10 lg:pt-8">
        {isLoading && !data ? (
          <HomeSkeleton />
        ) : loadError && !data ? (
          <InitialError
            message={loadError}
            onRetry={() => {
              void retryLoadHome();
            }}
          />
        ) : view && data ? (
          <div className="mx-auto max-w-3xl lg:mx-0 lg:max-w-5xl">
            <HomeHeader
              clientFirstName={view.clientFirstName}
              isRefreshing={isLoading}
            />
            {view.plan.kind === "active" ? (
              <div className="space-y-4">
                {view.week ? <HomeWeekOverviewCard week={view.week} /> : null}
                <TrainingHeroCard
                  error={sessionActionError}
                  hero={view.hero}
                  isOpening={isOpeningSession}
                  onAction={() =>
                    void handleSessionAction(view.hero?.day ?? null)
                  }
                />
                {view.week ? <WeekSessionList token={token} week={view.week} /> : null}
                {view.nextActivity ? (
                  <NextActivityRow
                    activity={view.nextActivity}
                    isOpening={isOpeningSession}
                    onOpen={(day) => void handleSessionAction(day)}
                  />
                ) : null}
              </div>
            ) : (
              <PlanStateCard plan={view.plan} token={token} />
            )}
          </div>
        ) : null}
      </section>
    </ClientPortalShell>
  );
}

function HomeHeader({
  clientFirstName,
  isRefreshing,
}: {
  clientFirstName: string;
  isRefreshing: boolean;
}) {
  return (
    <header className="mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-normal text-foreground lg:text-3xl">
            Hola, {clientFirstName}
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
            Tu entrenamiento, progreso y semana en un solo lugar.
          </p>
        </div>
        {isRefreshing ? <RefreshPill /> : null}
      </div>
    </header>
  );
}

function TrainingHeroCard({
  error,
  hero,
  isOpening,
  onAction,
}: {
  error: string | null;
  hero: ClientHomeHeroView | null;
  isOpening: boolean;
  onAction: () => void;
}) {
  if (!hero) {
    return (
      <article className="rounded-2xl border border-transparent bg-card p-5 shadow-[var(--surface-shadow-soft)] md:p-6">
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary"
        >
          <CalendarDays className="size-5" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase text-primary">
          Semana tranquila
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-normal text-foreground md:text-2xl">
          No tienes entrenamientos pendientes
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Tu semana no tiene sesiones por abrir en este momento.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-transparent bg-card p-5 shadow-[var(--surface-shadow-soft)] md:p-6">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary"
        >
          <Dumbbell className="size-6" />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase text-primary">
            {hero.eyebrow}
          </p>
          <HomeStatusBadge day={hero.day} />
        </div>
      </div>
      <h2 className="mt-4 text-xl font-semibold leading-tight tracking-normal text-foreground md:text-2xl">
        {hero.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {hero.detail}
      </p>
      {error ? (
        <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        className="mt-5 h-11 w-full rounded-xl md:w-auto md:px-5"
        disabled={isOpening}
        onClick={onAction}
        type="button"
      >
        {isOpening ? <Loader2 className="size-5 animate-spin" /> : null}
        {hero.actionLabel}
      </Button>
    </article>
  );
}

function HomeWeekOverviewCard({
  week,
}: {
  week: ClientHomeWeekView;
}) {
  return (
    <article className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-center gap-4 rounded-2xl border border-transparent bg-card p-4 shadow-[var(--surface-shadow-soft)]">
      <CurrentStreakCard streak={week.currentStreak} />
      <div className="min-w-0 border-l border-border pl-4">
        <p className="text-2xl font-semibold leading-none text-foreground">
          {week.summaryFractionLabel}
        </p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          sesiones completadas
        </p>
        <div
          aria-label="Resumen de días de la semana"
          className="mt-3 flex items-center gap-1.5"
        >
          {week.days.map((day) => (
            <WeekStatusDot day={day} key={day.date} />
          ))}
        </div>
      </div>
    </article>
  );
}

function CurrentStreakCard({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary"
      >
        <Flame className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="whitespace-nowrap text-2xl font-semibold leading-none text-foreground">
          {streak} {plural(streak, "sesión", "sesiones")}
        </p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          {streak === 0 ? "Inicia tu racha" : "Racha actual"}
        </p>
      </div>
    </div>
  );
}

function WeekSessionList({
  token,
  week,
}: {
  token: string;
  week: ClientHomeWeekView;
}) {
  return (
    <section className="rounded-2xl border border-transparent bg-card shadow-[var(--surface-shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 px-4 pt-4">
          <h2 className="text-lg font-semibold tracking-normal text-foreground">
            Tu semana
          </h2>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {week.weekLabel} · {week.rangeLabel}
          </p>
        </div>
        <Link
          className="mr-4 mt-4 inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          href={`/c/${encodeURIComponent(token)}/calendar`}
        >
          Ver calendario
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {week.sessions.length > 0 ? (
        <div className="mt-4 divide-y divide-border">
          {week.sessions.map((day) => (
            <WeekSessionRow day={day} key={day.date} />
          ))}
        </div>
      ) : (
        <div className="px-4 pb-4 pt-5">
          <p className="rounded-xl bg-accent/45 px-4 py-3 text-sm text-muted-foreground">
            No tienes sesiones programadas esta semana.
          </p>
        </div>
      )}
    </section>
  );
}

function NextActivityRow({
  activity,
  isOpening,
  onOpen,
}: {
  activity: ClientHomeNextActivityView;
  isOpening: boolean;
  onOpen: (day: ClientPortalDay) => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-transparent bg-card p-4 text-left shadow-[var(--surface-shadow-soft)] transition hover:bg-accent/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      disabled={isOpening}
      onClick={() => onOpen(activity.day)}
      type="button"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary"
      >
        <CalendarDays className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase text-primary">
          Próximo entrenamiento
        </span>
        <span className="mt-1 block truncate text-base font-semibold text-foreground">
          {activity.sessionName}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {activity.dateLabel}
        </span>
      </span>
      <HomeStatusBadge day={activity.day} />
      <ChevronRight className="size-5 shrink-0 text-primary" />
    </button>
  );
}

function WeekSessionRow({ day }: { day: ClientHomeWeekDayView }) {
  return (
    <div
      className="grid grid-cols-[3.25rem_2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
      title={`${day.dayLabel} ${day.dateNumber}: ${day.statusLabel}. ${day.sessionName}`}
    >
      <div className="text-center">
        <p className="text-[0.68rem] font-semibold uppercase leading-none text-muted-foreground">
          {day.dayLabel}
        </p>
        <p className="mt-1 text-lg font-semibold leading-none text-foreground">
          {Number(day.dateNumber)}
        </p>
      </div>
      <WeekStatusDot day={day} size="lg" />
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {day.sessionName}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {day.isToday ? "Hoy" : day.statusLabel}
        </p>
      </div>
      <WeekStatusBadge day={day} />
    </div>
  );
}

function WeekStatusDot({
  day,
  size = "sm",
}: {
  day: ClientHomeWeekDayView;
  size?: "sm" | "lg";
}) {
  return (
    <span
      aria-label={`${day.dayLabel} ${day.dateNumber}: ${day.statusLabel}`}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-2",
        size === "lg" ? "size-8" : "size-6",
        weekStatusMarkToneClass(day.tone),
        day.isToday && "ring-2 ring-primary/35 ring-offset-2 ring-offset-card",
      )}
      title={`${day.statusLabel}${day.isToday ? " · Hoy" : ""}`}
    >
      {day.tone === "rest" ? (
        <span className="text-sm font-semibold leading-none">-</span>
      ) : day.tone === "completed" || day.tone === "partial" ? (
        <Check className={size === "lg" ? "size-4" : "size-3.5"} />
      ) : day.tone === "overdue" ? (
        <AlertTriangle className={size === "lg" ? "size-4" : "size-3.5"} />
      ) : day.tone === "active" ? (
        <ChevronRight className={size === "lg" ? "size-4" : "size-3.5"} />
      ) : null}
    </span>
  );
}

function weekStatusMarkToneClass(tone: ClientHomeWeekDayView["tone"]) {
  if (tone === "completed") {
    return "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-500 dark:text-emerald-950";
  }
  if (tone === "partial") {
    return "border-amber-500 bg-amber-500 text-white dark:border-amber-300 dark:bg-amber-400 dark:text-amber-950";
  }
  if (tone === "overdue") {
    return "border-red-500 text-red-600 dark:border-red-400 dark:text-red-300";
  }
  if (tone === "active") {
    return "border-primary bg-primary text-primary-foreground";
  }
  if (tone === "pending") {
    return "border-primary/80 text-primary";
  }
  return "border-border bg-background text-muted-foreground";
}

function HomeStatusBadge({ day }: { day: ClientPortalDay }) {
  return (
    <Badge
      className="max-w-full justify-center truncate"
      variant={homeBadgeVariant(day)}
    >
      {homeStatusLabel(day)}
    </Badge>
  );
}

function WeekStatusBadge({ day }: { day: ClientHomeWeekDayView }) {
  return (
    <Badge
      className="max-w-[6.5rem] justify-center truncate px-2"
      variant={weekBadgeVariant(day.tone)}
    >
      {day.statusLabel}
    </Badge>
  );
}

function weekBadgeVariant(tone: ClientHomeWeekDayView["tone"]): BadgeVariant {
  if (tone === "completed") return "success";
  if (tone === "partial") return "warning";
  if (tone === "overdue") return "danger";
  if (tone === "active") return "default";
  if (tone === "pending" || tone === "upcoming") return "outline";
  return "muted";
}

function homeBadgeVariant(day: ClientPortalDay): BadgeVariant {
  const status = day.log?.status ?? day.status;
  if (!day.session || day.status === "no_session") return "muted";
  if (status === "completed") return "success";
  if (status === "partially_completed") return "warning";
  if (status === "overdue") return "danger";
  if (status === "opened" || status === "in_progress") return "default";
  if (status === "pending") return "outline";
  return "muted";
}

function homeStatusLabel(day: ClientPortalDay) {
  const status = day.log?.status ?? day.status;
  if (!day.session || day.status === "no_session") return "Descanso";
  if (status === "completed") return "Completada";
  if (status === "partially_completed") return "Parcial";
  if (status === "opened" || status === "in_progress") return "En curso";
  if (status === "overdue") return "Atrasada";
  if (status === "pending" && day.canOpen) return "Pendiente";
  return "Próxima";
}

function PlanStateCard({
  plan,
  token,
}: {
  plan: Exclude<ClientHomePlanView, { kind: "active" }>;
  token: string;
}) {
  return (
    <article className="rounded-2xl border border-transparent bg-card p-5 shadow-[var(--surface-shadow-soft)] md:p-6">
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary"
      >
        <CalendarDays className="size-5" />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase text-primary">
        {plan.kind === "no_plan" ? "Plan en preparación" : "Tu plan"}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-normal text-foreground md:text-2xl">
        {plan.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {plan.description}
      </p>
      {plan.kind === "not_started" ? (
        <div className="mt-5 grid gap-2 rounded-xl bg-accent/45 p-4 text-sm font-medium text-foreground">
          <span>{plan.planName}</span>
          <span>Inicio: {plan.startDateLabel}</span>
          <span>{plan.durationLabel}</span>
        </div>
      ) : null}
      {plan.kind === "plan_finished" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button asChild>
            <Link href={`/c/${encodeURIComponent(token)}/progress`}>
              Ver progreso
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/c/${encodeURIComponent(token)}/calendar`}>
              Revisar calendario
            </Link>
          </Button>
        </div>
      ) : null}
      {plan.kind === "not_started" && plan.actions.length > 0 ? (
        <Button asChild className="mt-6 w-full sm:w-auto" variant="outline">
          <Link href={`/c/${encodeURIComponent(token)}/profile`}>
            Revisar perfil
          </Link>
        </Button>
      ) : null}
    </article>
  );
}

function InitialError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-transparent bg-card p-6 shadow-[var(--surface-shadow-soft)]">
      <p className="text-xs font-semibold uppercase text-destructive">
        Algo salió mal
      </p>
      <h1 className="mt-3 text-xl font-semibold text-foreground">
        No pudimos cargar tu inicio
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <Button
        className="mt-6"
        onClick={onRetry}
        type="button"
      >
        <RotateCcw className="size-4" />
        Reintentar
      </Button>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 lg:mx-0 lg:max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-2xl bg-muted" />
        <div className="h-7 w-28 rounded-full bg-muted" />
      </div>
      <div className="space-y-3">
        <div className="h-5 w-72 max-w-full rounded-2xl bg-muted" />
      </div>
      <div className="h-32 rounded-2xl bg-card shadow-[var(--surface-shadow-soft)]" />
      <div className="h-56 rounded-2xl bg-card shadow-[var(--surface-shadow-soft)]" />
      <div className="rounded-2xl bg-card shadow-[var(--surface-shadow-soft)]">
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="h-5 w-28 rounded-xl bg-muted" />
            <div className="mt-2 h-4 w-20 rounded-xl bg-muted" />
          </div>
          <div className="h-5 w-24 rounded-xl bg-muted" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="grid grid-cols-[3.25rem_2rem_minmax(0,1fr)_4.5rem] items-center gap-3 px-4 py-3"
              key={index}
            >
              <div className="space-y-2">
                <div className="mx-auto h-3 w-7 rounded-xl bg-muted" />
                <div className="mx-auto h-5 w-5 rounded-xl bg-muted" />
              </div>
              <div className="size-8 rounded-full bg-muted" />
              <div className="min-w-0 space-y-2">
                <div className="h-4 w-full rounded-xl bg-muted" />
                <div className="h-3 w-20 rounded-xl bg-muted" />
              </div>
              <div className="h-6 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-20 rounded-2xl bg-card shadow-[var(--surface-shadow-soft)]" />
    </div>
  );
}

function RefreshPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
      <Loader2 className="size-3.5 animate-spin" />
      Actualizando
    </span>
  );
}

function plural(count: number, singular: string, pluralValue: string) {
  return count === 1 ? singular : pluralValue;
}

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof CoraFitApiError) return caught.message || fallback;
  if (caught instanceof Error) return caught.message || fallback;
  return fallback;
}
