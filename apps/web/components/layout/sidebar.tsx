"use client";

import { DumbbellIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { navItems } from "./nav-items";
import { NavItem } from "./nav-item";

export function Sidebar() {
  const router = useRouter();
  const { logout, profile } = useAuth();
  const name = profile?.user?.name ?? "Coach";
  const initials = getInitials(name);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-56 flex-col bg-[#12161d] text-white lg:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pb-8 pt-7">
        <div className="flex size-10 items-center justify-center rounded-md text-[#ef6a55]">
          <DumbbellIcon className="size-5" />
        </div>
        <span className="text-xl font-bold tracking-tight">CoraFit</span>
      </div>

      {/* Navegación */}
      <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Usuario */}
      <div className="px-4 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-[#ef6a55] text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-white/55">Coach</p>
          </div>
          <Button
            aria-label="Cerrar sesion"
            className="size-8 text-white/60 hover:bg-white/10 hover:text-white"
            size="icon"
            type="button"
            variant="ghost"
            onClick={handleLogout}
          >
            <LogOutIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </aside>
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
