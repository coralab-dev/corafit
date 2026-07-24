import {
  ActivityIcon,
  Building2Icon,
  ClipboardListIcon,
  DumbbellIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import type { CurrentAuthProfile } from "@/lib/auth/types";

export type AppNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  requiresOrganization?: boolean;
  platformRole?: "admin_saas";
};

export type AppNavSection = {
  key: string;
  label: string;
  items: readonly AppNavItem[];
};

export const navSections: readonly AppNavSection[] = [
  {
    key: "operation",
    label: "Operación",
    items: [
      { href: "/", icon: ActivityIcon, label: "Dashboard", requiresOrganization: true },
      { href: "/clients", icon: UsersIcon, label: "Clientes", requiresOrganization: true },
      { href: "/exercises", icon: DumbbellIcon, label: "Ejercicios", requiresOrganization: true },
      { href: "/training-plans", icon: ClipboardListIcon, label: "Planes", requiresOrganization: true },
      { href: "#", icon: SmartphoneIcon, label: "Portal", disabled: true, requiresOrganization: true },
    ],
  },
  {
    key: "administration",
    label: "Administración SaaS",
    items: [
      { href: "/admin/organizations", icon: Building2Icon, label: "Organizaciones", platformRole: "admin_saas" },
      { href: "/admin/exercises", icon: ShieldCheckIcon, label: "Ejercicios globales", platformRole: "admin_saas" },
    ],
  },
  {
    key: "account",
    label: "Cuenta",
    items: [{ href: "/settings", icon: SettingsIcon, label: "Configuración", requiresOrganization: true }],
  },
];

export function getVisibleNavSections(
  profile: CurrentAuthProfile | null | undefined,
): AppNavSection[] {
  const isAdmin = profile?.user.platformRole === "admin_saas";
  const hasOrganization = Boolean(profile?.organization);

  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          (!item.platformRole || (item.platformRole === "admin_saas" && isAdmin)) &&
          (!item.requiresOrganization || hasOrganization),
      ),
    }))
    .filter((section) => section.items.length > 0);
}
