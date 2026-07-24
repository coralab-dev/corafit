"use client";

import { CoraFitBrand } from "@/components/shared/corafit-brand";
import { useAuth } from "@/components/providers/auth-provider";
import { getVisibleNavSections } from "./nav-items";
import { NavigationSections } from "./navigation-sections";
import { UserNavigationCard } from "./user-navigation-card";

export function Sidebar() {
  const { profile } = useAuth();
  const visibleNavSections = getVisibleNavSections(profile);

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-3 px-5 pb-8 pt-7">
        <CoraFitBrand className="h-8 w-auto" />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <NavigationSections sections={visibleNavSections} />
      </nav>

      <div className="px-4 pb-5">
        <UserNavigationCard />
      </div>
    </aside>
  );
}
