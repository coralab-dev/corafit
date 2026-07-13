"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  Dumbbell,
  Loader2,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { CoraFitApiError } from "@/lib/api/authenticated-request";
import {
  clientPortalRequest,
  type ClientPortalDay,
  type ClientPortalHome,
  type ClientSessionLog,
} from "@/lib/client-portal/api";
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
        errorMessage(caught, "No pudimos abrir la sesion."),
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
      <section className="px-5 pt-6 md:px-8 lg:px-10 lg:pt-8">
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
              clientName={data.client.name}
              clientFirstName={view.clientFirstName}
              isRefreshing={isLoading}
              token={token}
            />
            {view.plan.kind === "active" ? (
              <div className="space-y-4">
                <TrainingHeroCard
                  error={sessionActionError}
                  hero={view.hero}
                  isOpening={isOpeningSession}
                  onAction={() =>
                    void handleSessionAction(view.hero?.day ?? null)
                  }
                />
                {view.week ? (
                  <>
                    <CurrentStreakCard streak={view.week.currentStreak} />
                    <WeekSummaryCard token={token} week={view.week} />
                  </>
                ) : null}
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
  clientName,
  clientFirstName,
  isRefreshing,
  token,
}: {
  clientName: string;
  clientFirstName: string;
  isRefreshing: boolean;
  token: string;
}) {
  return (
    <header className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 lg:hidden">
          <Dumbbell className="size-6 rotate-[-25deg] text-[var(--portal-accent)]" />
          <span className="text-2xl font-black tracking-normal">CoraFit</span>
        </div>
        <div className="hidden lg:block">
          {isRefreshing ? <RefreshPill /> : null}
        </div>
        <Link
          aria-label="Abrir perfil"
          className="flex size-11 items-center justify-center rounded-full bg-[#121722] text-sm font-black text-white shadow-[0_12px_28px_rgba(18,23,34,0.18)] dark:bg-[#f4f6f8] dark:text-[#0b0d0f]"
          href={`/c/${encodeURIComponent(token)}/profile`}
        >
          {initials(clientName) || <UserRound className="size-5" />}
        </Link>
      </div>
      <div className="mt-5 lg:mt-0">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-black tracking-normal lg:text-4xl">
            Hola, {clientFirstName}
          </h1>
          <div className="lg:hidden">{isRefreshing ? <RefreshPill /> : null}</div>
        </div>
        <p className="mt-2 max-w-xl text-base font-medium leading-7 text-[#4e5968] dark:text-[#c7cfdb]">
          Tu entrenamiento, progreso y semana en un solo lugar.
        </p>
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
      <article className="rounded-2xl border border-[#ece7e3] bg-white p-6 shadow-[0_16px_42px_rgba(18,23,34,0.08)] dark:border-[#293140] dark:bg-[#121722]">
        <p className="text-sm font-black text-[var(--portal-accent)]">
          Semana tranquila
        </p>
        <h2 className="mt-4 text-3xl font-black tracking-normal">
          No tienes entrenamientos pendientes
        </h2>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-[#ece7e3] bg-white p-5 shadow-[0_16px_42px_rgba(18,23,34,0.08)] dark:border-[#293140] dark:bg-[#121722] md:p-6">
      <p className="text-sm font-black text-[var(--portal-accent)]">
        {hero.eyebrow}
      </p>
      <h2 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-normal md:text-5xl">
        {hero.title}
      </h2>
      <p className="mt-4 text-base font-black text-[#4e5968] dark:text-[#c7cfdb] md:text-lg">
        {hero.detail}
      </p>
      {error ? (
        <p className="mt-4 rounded-2xl border border-[var(--portal-accent)] bg-[var(--portal-accent-soft)] p-3 text-sm font-bold text-[#121722] dark:text-[#f4f6f8]">
          {error}
        </p>
      ) : null}
      <button
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#121722] px-5 text-base font-black text-white shadow-[0_14px_30px_rgba(18,23,34,0.2)] transition hover:-translate-y-0.5 disabled:opacity-60 dark:bg-[var(--portal-accent)] dark:text-[var(--portal-accent-on)]"
        disabled={isOpening}
        onClick={onAction}
        type="button"
      >
        {isOpening ? <Loader2 className="size-5 animate-spin" /> : null}
        {hero.actionLabel}
      </button>
    </article>
  );
}

function CurrentStreakCard({ streak }: { streak: number }) {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-[#ece7e3] bg-white p-4 shadow-[0_12px_32px_rgba(18,23,34,0.06)] dark:border-[#293140] dark:bg-[#121722]">
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--portal-accent-soft)] text-2xl"
      >
        {"\uD83D\uDD25"}
      </span>
      <div>
        <p className="text-sm font-black text-[var(--portal-accent)]">
          Racha actual
        </p>
        <p className="mt-1 text-lg font-black">
          {streak} {plural(streak, "sesion seguida", "sesiones seguidas")}
        </p>
      </div>
    </article>
  );
}

function WeekSummaryCard({
  token,
  week,
}: {
  token: string;
  week: ClientHomeWeekView;
}) {
  return (
    <article className="rounded-2xl border border-[#ece7e3] bg-white p-5 shadow-[0_16px_42px_rgba(18,23,34,0.08)] dark:border-[#293140] dark:bg-[#121722] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-normal">Tu semana</h2>
          <p className="mt-1 text-sm font-bold text-[#667080] dark:text-[#c7cfdb]">
            {week.weekLabel} · {week.rangeLabel}
          </p>
        </div>
        <Link
          className="inline-flex shrink-0 items-center gap-1 text-sm font-black text-[var(--portal-accent)]"
          href={`/c/${encodeURIComponent(token)}/calendar`}
        >
          Ver calendario
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div className="flex min-w-max snap-x snap-mandatory gap-3 px-0.5 md:grid md:min-w-0 md:grid-cols-7">
          {week.days.map((day) => (
            <WeekDayCard day={day} key={day.date} />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-base font-black">{week.progressLabel}</p>
          <p className="text-base font-black">{week.completionPercent}%</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#eceff2] dark:bg-[#242b36]">
          <div
            className="h-full rounded-full bg-[var(--portal-accent)]"
            style={{ width: `${week.completionPercent}%` }}
          />
        </div>
        <p className="mt-4 text-sm font-bold text-[#667080] dark:text-[#c7cfdb]">
          {week.pendingLabel}
        </p>
      </div>
    </article>
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
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#ece7e3] bg-white p-4 text-left shadow-[0_12px_32px_rgba(18,23,34,0.06)] transition hover:bg-[#f7f8f9] disabled:opacity-60 dark:border-[#293140] dark:bg-[#121722] dark:hover:bg-[#171d28]"
      disabled={isOpening}
      onClick={() => onOpen(activity.day)}
      type="button"
    >
      <span className="min-w-0">
        <span className="block text-sm font-black text-[var(--portal-accent)]">
          Proximo entrenamiento
        </span>
        <span className="mt-1 block truncate text-base font-black">
          {activity.dateLabel}
        </span>
      </span>
      <ChevronRight className="size-6 shrink-0 text-[var(--portal-accent)]" />
    </button>
  );
}

function WeekDayCard({ day }: { day: ClientHomeWeekDayView }) {
  return (
    <div
      className={[
        "flex min-h-28 w-24 shrink-0 snap-start flex-col items-center rounded-2xl border p-3 text-center md:w-auto",
        weekDayToneClass(day),
        day.isToday
          ? "border-[var(--portal-accent)] bg-[var(--portal-accent-soft)]"
          : "",
      ].join(" ")}
    >
      <p className="text-xs font-black uppercase text-[#667080] dark:text-[#c7cfdb]">
        {day.dayLabel}
      </p>
      <p className="mt-1 text-lg font-black">{day.dateNumber}</p>
      <p
        className="mx-auto mt-4 max-w-full truncate text-center text-xs font-black"
        title={day.sessionName}
      >
        {day.sessionName}
      </p>
      <p className="mt-auto max-w-full truncate text-[0.68rem] font-bold text-[#667080] dark:text-[#c7cfdb]">
        {day.statusLabel}
      </p>
    </div>
  );
}

function weekDayToneClass(day: ClientHomeWeekDayView) {
  if (day.tone === "active") {
    return "border-[var(--portal-accent)] bg-[var(--portal-accent-soft)] text-[#121722] dark:text-[#f4f6f8]";
  }
  if (day.tone === "overdue") {
    return "border-[var(--portal-accent)] bg-white text-[#121722] dark:bg-[#121722] dark:text-[#f4f6f8]";
  }
  return "border-[#e2e5e9] bg-[#f7f8f9] text-[#121722] dark:border-[#293140] dark:bg-[#171d28] dark:text-[#f4f6f8]";
}

function PlanStateCard({
  plan,
  token,
}: {
  plan: Exclude<ClientHomePlanView, { kind: "active" }>;
  token: string;
}) {
  return (
    <article className="rounded-2xl border border-[#ece7e3] bg-white p-6 shadow-[0_16px_42px_rgba(18,23,34,0.08)] dark:border-[#293140] dark:bg-[#121722]">
      <p className="text-sm font-black text-[var(--portal-accent)]">
        {plan.kind === "no_plan" ? "Plan en preparacion" : "Tu plan"}
      </p>
      <h2 className="mt-4 text-3xl font-black tracking-normal">
        {plan.title}
      </h2>
      <p className="mt-3 text-base font-bold leading-7 text-[#4e5968] dark:text-[#c7cfdb]">
        {plan.description}
      </p>
      {plan.kind === "not_started" ? (
        <div className="mt-5 grid gap-3 rounded-2xl bg-[#f3f6f9] p-4 text-sm font-bold dark:bg-[#171d28]">
          <span>{plan.planName}</span>
          <span>Inicio: {plan.startDateLabel}</span>
          <span>{plan.durationLabel}</span>
        </div>
      ) : null}
      {plan.kind === "plan_finished" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            className="flex h-12 items-center justify-center rounded-2xl bg-[#121722] text-sm font-black text-white dark:bg-[var(--portal-accent)] dark:text-[var(--portal-accent-on)]"
            href={`/c/${encodeURIComponent(token)}/progress`}
          >
            Ver progreso
          </Link>
          <Link
            className="flex h-12 items-center justify-center rounded-2xl border border-[var(--portal-accent)] text-sm font-black text-[var(--portal-accent)]"
            href={`/c/${encodeURIComponent(token)}/calendar`}
          >
            Revisar calendario
          </Link>
        </div>
      ) : null}
      {plan.kind === "not_started" && plan.actions.length > 0 ? (
        <Link
          className="mt-6 flex h-12 items-center justify-center rounded-2xl border border-[var(--portal-accent)] text-sm font-black text-[var(--portal-accent)]"
          href={`/c/${encodeURIComponent(token)}/profile`}
        >
          Revisar perfil
        </Link>
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
    <div className="mx-auto max-w-2xl rounded-2xl border border-[#f2c8c0] bg-white p-6 shadow-sm dark:border-[#4b2b24] dark:bg-[#121722]">
      <p className="text-sm font-black text-[var(--portal-accent)]">
        Algo salio mal
      </p>
      <h1 className="mt-3 text-2xl font-black">No pudimos cargar tu inicio</h1>
      <p className="mt-3 text-sm font-bold leading-6 text-[#667080] dark:text-[#c7cfdb]">
        {message}
      </p>
      <button
        className="mt-6 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#121722] px-5 text-sm font-black text-white dark:bg-[var(--portal-accent)] dark:text-[var(--portal-accent-on)]"
        onClick={onRetry}
        type="button"
      >
        <RotateCcw className="size-4" />
        Reintentar
      </button>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 lg:mx-0 lg:max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="h-9 w-32 rounded-2xl bg-[#ece7e3] dark:bg-[#242b36]" />
        <div className="size-11 rounded-full bg-[#ece7e3] dark:bg-[#242b36]" />
      </div>
      <div className="space-y-3">
        <div className="h-9 w-52 rounded-2xl bg-[#ece7e3] dark:bg-[#242b36]" />
        <div className="h-5 w-72 max-w-full rounded-2xl bg-[#ece7e3] dark:bg-[#242b36]" />
      </div>
      <div className="h-64 rounded-2xl bg-[#ece7e3] shadow-sm dark:bg-[#242b36]" />
      <div className="flex items-center gap-4 rounded-2xl border border-[#ece7e3] bg-white p-4 shadow-sm dark:border-[#293140] dark:bg-[#121722]">
        <div className="size-12 rounded-2xl bg-[#ece7e3] dark:bg-[#242b36]" />
        <div className="space-y-2">
          <div className="h-4 w-24 rounded-xl bg-[#ece7e3] dark:bg-[#242b36]" />
          <div className="h-5 w-36 rounded-xl bg-[#ece7e3] dark:bg-[#242b36]" />
        </div>
      </div>
      <div className="rounded-2xl border border-[#ece7e3] bg-white p-5 shadow-sm dark:border-[#293140] dark:bg-[#121722]">
        <div className="flex items-center justify-between">
          <div className="h-6 w-28 rounded-xl bg-[#ece7e3] dark:bg-[#242b36]" />
          <div className="h-5 w-24 rounded-xl bg-[#ece7e3] dark:bg-[#242b36]" />
        </div>
        <div className="mt-5 overflow-hidden pb-2">
          <div className="flex min-w-max gap-3 px-0.5 md:grid md:min-w-0 md:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                className="h-32 w-24 shrink-0 rounded-2xl bg-[#ece7e3] dark:bg-[#242b36] md:w-auto"
                key={index}
              />
            ))}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div className="h-5 w-48 rounded-xl bg-[#ece7e3] dark:bg-[#242b36]" />
          <div className="h-5 w-10 rounded-xl bg-[#ece7e3] dark:bg-[#242b36]" />
        </div>
        <div className="mt-3 h-3 rounded-full bg-[#ece7e3] dark:bg-[#242b36]" />
      </div>
    </div>
  );
}

function RefreshPill() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--portal-accent-soft)] px-3 py-1 text-xs font-black text-[var(--portal-accent)]">
      <Loader2 className="size-3.5 animate-spin" />
      Actualizando
    </span>
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
}

function plural(count: number, singular: string, pluralValue: string) {
  return count === 1 ? singular : pluralValue;
}

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof CoraFitApiError) return caught.message || fallback;
  if (caught instanceof Error) return caught.message || fallback;
  return fallback;
}
