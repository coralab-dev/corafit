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
        "relative flex items-center gap-3 rounded-md px-4 py-3 text-sm transition-colors",
        isActive
          ? "bg-white/10 font-semibold text-[#ff7a64] after:absolute after:bottom-0 after:right-0 after:top-0 after:w-0.5 after:rounded-full after:bg-[#ff7a64]"
          : "text-white/68 hover:bg-white/8 hover:text-white",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
