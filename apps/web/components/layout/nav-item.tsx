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
}

export function NavItem({ href, icon: Icon, label, disabled }: NavItemProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === href : pathname.startsWith(href);

  if (disabled) {
    return (
      <div className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-foreground/45">
        <Icon className="size-4" />
        {label}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-[background,color]",
        isActive
          ? "bg-sidebar-accent font-semibold text-sidebar-primary"
          : "text-sidebar-foreground/68 hover:bg-sidebar-accent/75 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
