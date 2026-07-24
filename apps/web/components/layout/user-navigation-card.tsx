"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserNavigationCardProps {
  className?: string;
  onLogout?: () => void;
}

export function UserNavigationCard({ className, onLogout }: UserNavigationCardProps) {
  const router = useRouter();
  const { logout, profile } = useAuth();
  const name = profile?.user.name ?? "Coach";

  async function handleLogout() {
    onLogout?.();
    await logout();
    router.replace("/login");
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/65 p-3",
        className,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
        {getInitials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-xs text-sidebar-foreground/55">
          {profile?.user.platformRole === "admin_saas" ? "Admin SaaS" : "Coach"}
        </p>
      </div>
      <Button
        aria-label="Cerrar sesión"
        className="size-8 shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        size="icon"
        type="button"
        variant="ghost"
        onClick={() => void handleLogout()}
      >
        <LogOutIcon aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
