"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CoraFitBrand } from "@/components/shared/corafit-brand";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { getVisibleNavSections } from "./nav-items";
import { NavigationSections } from "./navigation-sections";
import { UserNavigationCard } from "./user-navigation-card";

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const visibleNavSections = getVisibleNavSections(profile);
  const handleNavigate = createMobileNavigationHandler(setOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("lg:hidden", className)}>
          <MenuIcon aria-hidden="true" className="size-5" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-[calc(100vw-1rem)] max-w-72 flex-col gap-0 overflow-hidden border-none bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navegación principal</SheetTitle>
        </SheetHeader>
        <div className="flex items-center px-5 py-5">
          <CoraFitBrand className="h-7 w-auto" />
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <NavigationSections sections={visibleNavSections} onNavigate={handleNavigate} />
        </nav>
        <div className="border-t border-sidebar-border px-3 py-4">
          <UserNavigationCard onLogout={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function createMobileNavigationHandler(setOpen: (open: boolean) => void) {
  return () => setOpen(false);
}
