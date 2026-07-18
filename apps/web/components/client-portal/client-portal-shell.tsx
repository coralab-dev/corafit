"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Calendar,
  Dumbbell,
  Home,
  Settings,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const clientPortalNavItems = [
  {
    key: "home",
    label: "Inicio",
    href: (token: string) => `/c/${encodeURIComponent(token)}/home`,
    icon: Home,
  },
  {
    key: "calendar",
    label: "Calendario",
    href: (token: string) => `/c/${encodeURIComponent(token)}/calendar`,
    icon: Calendar,
  },
  {
    key: "progress",
    label: "Progreso",
    href: (token: string) => `/c/${encodeURIComponent(token)}/progress`,
    icon: TrendingUp,
  },
  {
    key: "settings",
    label: "Config.",
    href: (token: string) => `/c/${encodeURIComponent(token)}/settings`,
    icon: Settings,
  },
] as const;

export type ClientPortalNavKey =
  | "home"
  | "calendar"
  | "progress"
  | "settings"
  | "profile";
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
    <main className="client-portal-viewport bg-[#f8f7f5] text-[#121722] [--portal-accent:#df4d3e] [--portal-accent-on:#ffffff] [--portal-accent-shadow:rgba(223,77,62,0.22)] [--portal-accent-soft:#fff1ee] dark:bg-background dark:text-foreground dark:[--portal-accent:var(--primary)] dark:[--portal-accent-on:var(--primary-foreground)] dark:[--portal-accent-shadow:rgba(254,61,27,0.22)] dark:[--portal-accent-soft:var(--accent)]">
      <div className="client-portal-viewport mx-auto w-full bg-[#fdfdfc] shadow-[0_22px_80px_rgba(18,23,34,0.10)] dark:bg-background md:max-w-3xl lg:max-w-6xl lg:bg-transparent lg:shadow-none lg:dark:bg-transparent">
        {active ? (
          <ClientPortalDesktopNav
            token={token}
            active={active}
            items={navItems}
          />
        ) : null}
        <div
          className={cn(
            "client-portal-viewport pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-10",
            active && "lg:pl-64",
          )}
        >
          {children}
        </div>
        {active ? (
          <ClientPortalBottomNav
            token={token}
            active={active}
            items={navItems}
          />
        ) : null}
      </div>
    </main>
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
    <aside className="hidden lg:fixed lg:bottom-0 lg:left-0 lg:top-0 lg:block lg:w-64 lg:border-r lg:border-[#ece7e3] lg:bg-[#fdfdfc] lg:px-6 lg:py-10 lg:dark:border-sidebar-border lg:dark:bg-sidebar lg:dark:text-sidebar-foreground">
      <BrandMark compact />
      <nav className="mt-12 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return (
            <Link
              className={cn(
                "flex h-12 items-center gap-4 rounded-xl px-4 text-sm font-bold text-[#667080] dark:text-sidebar-foreground/68",
                selected &&
                  "bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] dark:bg-sidebar-accent dark:text-sidebar-primary",
                !selected &&
                  "dark:hover:bg-sidebar-accent/75 dark:hover:text-sidebar-foreground",
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
      <div className="absolute bottom-10 left-6 right-6 rounded-xl border border-[#ece7e3] bg-white p-4 text-sm shadow-sm dark:border-sidebar-border dark:bg-sidebar-accent/65">
        <p className="font-bold dark:text-sidebar-foreground">
          Acceso seguro
        </p>
        <p className="mt-2 leading-6 text-[#667080] dark:text-sidebar-foreground/55">
          Tu informacion esta protegida.
        </p>
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
    <nav
      aria-label="Navegacion principal"
      className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[calc(0.65rem+env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="flex min-h-16 w-full max-w-[24rem] items-center justify-between gap-1 rounded-full border border-white/70 bg-[#f7f3ee]/82 px-2 py-1.5 shadow-[0_18px_45px_rgba(18,23,34,0.18),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#f7f3ee]/72 dark:border-sidebar-border/80 dark:bg-sidebar/90 dark:shadow-[0_18px_45px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] dark:supports-[backdrop-filter]:bg-sidebar/80">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return (
            <Link
              aria-current={selected ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-[0.64rem] font-bold leading-none text-[#7d827f] transition-all duration-200 ease-out dark:text-sidebar-foreground/60",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--portal-accent)] ",
                selected
                  ? "min-h-12 bg-white text-[var(--portal-accent)] shadow-[0_8px_22px_rgba(18,23,34,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] dark:bg-sidebar-accent dark:text-sidebar-primary dark:shadow-[0_8px_22px_rgba(0,0,0,0.3)]"
                  : "min-h-11 hover:bg-white/45 hover:text-[#565d66] dark:hover:bg-sidebar-accent/70 dark:hover:text-sidebar-foreground",
              )}
              href={item.href(token)}
              key={item.key}
            >
              <Icon
                className={cn(
                  "size-5 shrink-0 stroke-[2.1]",
                  selected && "size-6 stroke-[2.4]",
                )}
              />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
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
