"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Calendar,
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
          <div className="mx-auto max-w-3xl lg:mx-0 lg:max-w-4xl">
            <HomeHeader
              clientName={data.client.name}
              clientFirstName={view.clientFirstName}
              isRefreshing={isLoading}
              token={token}
            />
            {view.plan.kind === "active" ? (
              <>
                <HeroCard
                  error={sessionActionError}
                  hero={view.hero}
                  isOpening={isOpeningSession}
                  onAction={() => void handleSessionAction(view.hero?.day ?? null)}
                />
                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                  <WeekSummaryCard token={token} week={view.week} />
                  <NextActivityCard
                    activity={view.nextActivity}
                    emptyMessage={view.emptyNextActivityMessage}
                    isOpening={isOpeningSession}
                    onOpen={(day) => void handleSessionAction(day)}
                  />
                </div>
              </>
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

function HeroCard({
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
    <article className="rounded-2xl border border-[#f2d8cf] bg-[linear-gradient(145deg,#fff7f3_0%,#ffffff_58%,#fff1ee_100%)] p-5 shadow-[0_22px_55px_rgba(223,77,62,0.14)] dark:border-[#40301f] dark:bg-[linear-gradient(145deg,#1a202b_0%,#121722_64%,#211b10_100%)] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-black text-[var(--portal-accent)]">
            {hero.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-normal md:text-4xl">
            {hero.title}
          </h2>
          <p className="mt-3 text-base font-bold text-[#4e5968] dark:text-[#c7cfdb]">
            {hero.detail}
          </p>
        </div>
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--portal-accent)] text-[var(--portal-accent-on)] shadow-[0_12px_26px_var(--portal-accent-shadow)]">
          <Dumbbell className="size-7 rotate-[-25deg]" />
        </div>
      </div>
      {error ? (
        <p className="mt-5 rounded-2xl border border-[#f2c8c0] bg-[#fff4f1] p-3 text-sm font-bold text-[#9f3529]">
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

function WeekSummaryCard({
  token,
  week,
}: {
  token: string;
  week: ClientHomeWeekView | null;
}) {
  if (!week) return null;

  return (
    <article className="rounded-2xl border border-[#ece7e3] bg-white p-5 shadow-sm dark:border-[#293140] dark:bg-[#121722]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">Tu semana</h2>
        <span className="rounded-full bg-[var(--portal-accent-soft)] px-3 py-1 text-sm font-black text-[var(--portal-accent)]">
          {week.weekLabel}
        </span>
      </div>
      <p className="mt-5 text-lg font-black">{week.progressLabel}</p>
      <div className="mt-4 h-4 overflow-hidden rounded-full bg-[#f0eeee] dark:bg-[#242b36]">
        <div
          className="h-full rounded-full bg-[var(--portal-accent)]"
          style={{ width: `${week.completionPercent}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm font-black text-[#4e5968] dark:text-[#c7cfdb]">
        <span>{week.completionPercent} %</span>
        <span>{week.openedSessions ? `${week.openedSessions} abiertas` : null}</span>
      </div>
      <p className="mt-4 text-sm font-bold text-[#667080] dark:text-[#aab2bf]">
        {week.pendingLabel}
      </p>
      <Link
        className="mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--portal-accent)] text-sm font-black text-[var(--portal-accent)]"
        href={`/c/${encodeURIComponent(token)}/calendar`}
      >
        <Calendar className="size-5" />
        Ver calendario
      </Link>
    </article>
  );
}

function NextActivityCard({
  activity,
  emptyMessage,
  isOpening,
  onOpen,
}: {
  activity: ClientHomeNextActivityView | null;
  emptyMessage: string | null;
  isOpening: boolean;
  onOpen: (day: ClientPortalDay) => void;
}) {
  return (
    <article className="rounded-2xl border border-[#ece7e3] bg-white p-5 shadow-sm dark:border-[#293140] dark:bg-[#121722]">
      <h2 className="text-lg font-black">Proxima actividad</h2>
      {activity ? (
        <button
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-[#f8f7f5] p-4 text-left transition hover:bg-[var(--portal-accent-soft)] dark:bg-[#171d28]"
          disabled={isOpening}
          onClick={() => onOpen(activity.day)}
          type="button"
        >
          <span>
            <span className="block text-sm font-black text-[var(--portal-accent)]">
              Proximo entrenamiento
            </span>
            <span className="mt-2 block text-base font-black">
              {activity.dateLabel}
            </span>
          </span>
          <ChevronRight className="size-6 shrink-0 text-[var(--portal-accent)]" />
        </button>
      ) : (
        <p className="mt-4 rounded-2xl bg-[#f8f7f5] p-4 text-sm font-bold leading-6 text-[#667080] dark:bg-[#171d28] dark:text-[#c7cfdb]">
          {emptyMessage}
        </p>
      )}
    </article>
  );
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
        <div className="mt-5 grid gap-3 rounded-2xl bg-[#f8f7f5] p-4 text-sm font-bold dark:bg-[#171d28]">
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
    <div className="mx-auto max-w-3xl space-y-5 lg:mx-0 lg:max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="h-9 w-32 rounded-2xl bg-[#ece7e3] dark:bg-[#242b36]" />
        <div className="size-11 rounded-full bg-[#ece7e3] dark:bg-[#242b36]" />
      </div>
      <div className="space-y-3">
        <div className="h-9 w-52 rounded-2xl bg-[#ece7e3] dark:bg-[#242b36]" />
        <div className="h-5 w-72 max-w-full rounded-2xl bg-[#ece7e3] dark:bg-[#242b36]" />
      </div>
      <div className="h-64 rounded-2xl bg-[#ece7e3] shadow-sm dark:bg-[#242b36]" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="h-56 rounded-2xl bg-[#ece7e3] dark:bg-[#242b36]" />
        <div className="h-40 rounded-2xl bg-[#ece7e3] dark:bg-[#242b36]" />
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

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof CoraFitApiError) return caught.message || fallback;
  if (caught instanceof Error) return caught.message || fallback;
  return fallback;
}
