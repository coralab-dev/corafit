"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onNavigate?: () => void;
}

export function NavItem({ href, icon: Icon, label, disabled, onNavigate }: NavItemProps) {
  const pathname = usePathname();
  const isActive =
    href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  if (disabled) {
    return (
      <div className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-foreground/45">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "relative flex min-w-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-[background,color] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
        isActive
          ? "bg-sidebar-accent font-semibold text-sidebar-primary"
          : "text-sidebar-foreground/68 hover:bg-sidebar-accent/75 hover:text-sidebar-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}
