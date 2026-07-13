"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Loader2,
  RotateCcw,
  Sparkles,
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
              <TrainingCommandCenter
                actionError={sessionActionError}
                hero={view.hero}
                isOpening={isOpeningSession}
                nextActivity={view.nextActivity}
                onHeroAction={() =>
                  void handleSessionAction(view.hero?.day ?? null)
                }
                onNextActivity={(day) => void handleSessionAction(day)}
                token={token}
                week={view.week}
              />
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

function TrainingCommandCenter({
  actionError,
  hero,
  isOpening,
  nextActivity,
  onHeroAction,
  onNextActivity,
  token,
  week,
}: {
  actionError: string | null;
  hero: ClientHomeHeroView | null;
  isOpening: boolean;
  nextActivity: ClientHomeNextActivityView | null;
  onHeroAction: () => void;
  onNextActivity: (day: ClientPortalDay) => void;
  token: string;
  week: ClientHomeWeekView | null;
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[#dfe3e8] bg-white shadow-[0_18px_45px_rgba(18,23,34,0.08)] dark:border-[#293140] dark:bg-[#121722]">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="p-5 md:p-6 lg:p-7">
          {hero ? (
            <div className="flex min-h-[16rem] flex-col">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-sm font-black text-[var(--portal-accent)]">
                    {hero.eyebrow}
                  </p>
                  <h2 className="mt-4 text-5xl font-black leading-[0.95] tracking-normal md:text-6xl">
                    {hero.title}
                  </h2>
                </div>
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#121722] text-white shadow-[0_12px_26px_rgba(18,23,34,0.18)] dark:bg-[var(--portal-accent)] dark:text-[var(--portal-accent-on)]">
                  <Dumbbell className="size-7 rotate-[-25deg]" />
                </div>
              </div>
              <div className="mt-auto pt-8">
                <p className="text-lg font-black text-[#4e5968] dark:text-[#c7cfdb]">
                  {hero.detail}
                </p>
                {actionError ? (
                  <p className="mt-4 rounded-2xl border border-[#e5c1c1] bg-white p-3 text-sm font-bold text-[#9f3529] dark:bg-[#121722]">
                    {actionError}
                  </p>
                ) : null}
                <button
                  className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#121722] px-5 text-base font-black text-white shadow-[0_14px_30px_rgba(18,23,34,0.2)] transition hover:-translate-y-0.5 disabled:opacity-60 dark:bg-[var(--portal-accent)] dark:text-[var(--portal-accent-on)]"
                  disabled={isOpening}
                  onClick={onHeroAction}
                  type="button"
                >
                  {isOpening ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : null}
                  {hero.actionLabel}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[16rem] flex-col justify-center">
              <p className="text-sm font-black text-[var(--portal-accent)]">
                Semana tranquila
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-normal">
                No tienes entrenamientos pendientes
              </h2>
            </div>
          )}
        </div>
        <aside className="border-t border-[#e6e9ed] bg-[#f5f7f9] p-5 dark:border-[#293140] dark:bg-[#171d28] lg:border-l lg:border-t-0">
          {week ? (
            <div className="flex h-full flex-col">
              <p className="text-sm font-black text-[#667080] dark:text-[#c7cfdb]">
                {week.weekLabel}
              </p>
              <p className="mt-2 text-5xl font-black leading-none">
                {week.completionPercent}%
              </p>
              <p className="mt-3 text-sm font-bold leading-6 text-[#667080] dark:text-[#c7cfdb]">
                {week.progressLabel}
              </p>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e5e9ee] dark:bg-[#242b36]">
                <div
                  className="h-full rounded-full bg-[#121722] dark:bg-[var(--portal-accent)]"
                  style={{ width: `${week.completionPercent}%` }}
                />
              </div>
              <Link
                className="mt-7 inline-flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#121722] shadow-sm dark:bg-[#0d1016] dark:text-[#f4f6f8] lg:mt-auto"
                href={`/c/${encodeURIComponent(token)}/calendar`}
              >
                Ver calendario
                <ChevronRight className="size-4" />
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
      {week ? (
        <div className="border-t border-[#e6e9ed] bg-white p-5 dark:border-[#293140] dark:bg-[#121722] md:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-black">Tablero semanal</h2>
            <p className="mt-1 text-sm font-bold text-[#667080] dark:text-[#c7cfdb]">
              {week.rangeLabel} · {week.pendingLabel}
            </p>
          </div>
          <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-7 md:overflow-visible md:px-0 md:pb-0">
            {week.days.map((day) => (
              <WeekDayCard day={day} key={day.date} />
            ))}
          </div>
          {nextActivity ? (
            <button
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-[#f5f7f9] p-4 text-left transition hover:bg-[#eef2f6] dark:bg-[#171d28] dark:hover:bg-[#1a2230]"
              disabled={isOpening}
              onClick={() => onNextActivity(nextActivity.day)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block text-sm font-black text-[var(--portal-accent)]">
                  Proximo entrenamiento
                </span>
                <span className="mt-1 block truncate text-base font-black">
                  {nextActivity.dateLabel}
                </span>
              </span>
              <ChevronRight className="size-6 shrink-0 text-[var(--portal-accent)]" />
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function WeekDayCard({ day }: { day: ClientHomeWeekDayView }) {
  return (
    <div
      className={[
        "flex min-h-32 w-24 shrink-0 snap-start flex-col items-center rounded-2xl border p-3 text-center md:w-auto",
        weekDayToneClass(day),
        day.isToday
          ? "border-[var(--portal-accent)] bg-[#f3f6f9] shadow-[0_10px_24px_rgba(18,23,34,0.10)] dark:bg-[#1a2230]"
          : "",
      ].join(" ")}
    >
      <p className="text-xs font-black uppercase text-[#667080] dark:text-[#c7cfdb]">
        {day.dayLabel}
      </p>
      <p className="mt-1 text-lg font-black">{day.dateNumber}</p>
      <span className="mt-3 flex size-9 items-center justify-center rounded-full bg-white/80 text-[var(--portal-accent)] shadow-sm dark:bg-[#0d1016]/70">
        {weekDayIcon(day)}
      </span>
      <p className="mt-3 max-w-full truncate text-xs font-black" title={day.sessionName}>
        {day.sessionName}
      </p>
      <p className="mt-auto max-w-full truncate text-[0.68rem] font-bold text-[#667080] dark:text-[#c7cfdb]">
        {day.statusLabel}
      </p>
    </div>
  );
}

function weekDayToneClass(day: ClientHomeWeekDayView) {
  if (day.tone === "completed") {
    return "border-[#cce7d2] bg-[#f6fbf7] text-[#14562c] dark:border-[#27543a] dark:bg-[#122018] dark:text-[#bfe7c8]";
  }
  if (day.tone === "partial") {
    return "border-[#d9dee5] bg-[#f6f8fa] text-[#4e5968] dark:border-[#364153] dark:bg-[#171d28] dark:text-[#c7cfdb]";
  }
  if (day.tone === "active") {
    return "border-[var(--portal-accent)] bg-[var(--portal-accent)] text-[var(--portal-accent-on)] shadow-[0_10px_24px_var(--portal-accent-shadow)]";
  }
  if (day.tone === "overdue") {
    return "border-[#e5c1c1] bg-[#faf4f4] text-[#8f2f35] dark:border-[#593138] dark:bg-[#24181b] dark:text-[#ffb4b8]";
  }
  if (day.tone === "rest") {
    return "border-[#dbe7dc] bg-[#f4faf4] text-[#3e6b46] dark:border-[#2d4633] dark:bg-[#131d17] dark:text-[#b8d8bd]";
  }
  if (day.tone === "upcoming") {
    return "border-[#e2e5e9] bg-[#f3f6f9] text-[#4e5968] dark:border-[#293140] dark:bg-[#171d28] dark:text-[#c7cfdb]";
  }
  return "border-[#d8e0ea] bg-[#f5f8fb] text-[#36516f] dark:border-[#314052] dark:bg-[#171f2a] dark:text-[#c7d8eb]";
}

function weekDayIcon(day: ClientHomeWeekDayView) {
  if (day.tone === "completed") return <Check className="size-5" />;
  if (day.tone === "partial") return <Check className="size-5" />;
  if (day.tone === "active") return <Dumbbell className="size-5 rotate-[-25deg]" />;
  if (day.tone === "overdue") return <AlertTriangle className="size-5" />;
  if (day.tone === "rest") return <Sparkles className="size-5" />;
  if (day.tone === "upcoming") return <Clock className="size-5" />;
  return <Dumbbell className="size-5 rotate-[-25deg]" />;
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
      <div className="rounded-2xl border border-[#ece7e3] bg-white p-5 shadow-sm dark:border-[#293140] dark:bg-[#121722]">
        <div className="flex items-center justify-between">
          <div className="h-6 w-28 rounded-xl bg-[#ece7e3] dark:bg-[#242b36]" />
          <div className="h-5 w-24 rounded-xl bg-[#ece7e3] dark:bg-[#242b36]" />
        </div>
        <div className="-mx-5 mt-5 flex gap-3 overflow-hidden px-5 md:mx-0 md:grid md:grid-cols-7 md:px-0">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              className="h-32 w-24 shrink-0 rounded-2xl bg-[#ece7e3] dark:bg-[#242b36] md:w-auto"
              key={index}
            />
          ))}
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

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof CoraFitApiError) return caught.message || fallback;
  if (caught instanceof Error) return caught.message || fallback;
  return fallback;
}
