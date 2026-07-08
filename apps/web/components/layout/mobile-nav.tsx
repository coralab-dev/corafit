"use client";

import { useState } from "react";
import { DumbbellIcon, MenuIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import { NavItem } from "./nav-item";

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const name = profile?.user.name ?? "Coach";
  const visibleNavItems = navItems.filter(
    (item) =>
      (!item.platformRole || item.platformRole === profile?.user.platformRole) &&
      (!item.requiresOrganization || Boolean(profile?.organization)),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("lg:hidden", className)}>
          <MenuIcon className="size-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-64 flex-col gap-0 border-none bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="sr-only">
          <SheetTitle>Navegacion principal</SheetTitle>
        </SheetHeader>
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-md text-sidebar-primary">
            <DumbbellIcon className="size-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">CoraFit</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {visibleNavItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
              {getInitials(name)}
            </div>
            <p className="text-sm font-medium">
              {profile?.user.platformRole === "admin_saas" ? "Admin SaaS" : "Coach"}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
