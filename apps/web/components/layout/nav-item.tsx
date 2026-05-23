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
      <div className="flex cursor-not-allowed items-center gap-3 rounded-lg px-4 py-3 text-sm text-muted-foreground opacity-40">
        <Icon className="size-4" />
        {label}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors",
        isActive
          ? "bg-primary/10 font-medium text-primary after:absolute after:bottom-2 after:right-0 after:top-2 after:w-0.5 after:rounded-full after:bg-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
