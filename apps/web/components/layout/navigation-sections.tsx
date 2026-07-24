"use client";

import { cn } from "@/lib/utils";
import type { AppNavItem, AppNavSection } from "./nav-items";
import { NavItem } from "./nav-item";

interface NavigationSectionsProps {
  className?: string;
  onNavigate?: (item: AppNavItem) => void;
  sections: readonly AppNavSection[];
}

export function NavigationSections({ className, onNavigate, sections }: NavigationSectionsProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-5", className)}>
      {sections
        .filter((section) => section.items.length > 0)
        .map((section) => (
          <section key={section.key} className="min-w-0">
            <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/45">
              {section.label}
            </p>
            <div className="mt-2 flex min-w-0 flex-col gap-1">
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  onNavigate={() => onNavigate?.(item)}
                />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
