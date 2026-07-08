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

export type AppNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  requiresOrganization?: boolean;
  platformRole?: "admin_saas";
};

export const navItems: AppNavItem[] = [
  { href: "/", icon: ActivityIcon, label: "Dashboard", requiresOrganization: true },
  { href: "/clients", icon: UsersIcon, label: "Clientes", requiresOrganization: true },
  { href: "/exercises", icon: DumbbellIcon, label: "Ejercicios", requiresOrganization: true },
  { href: "/training-plans", icon: ClipboardListIcon, label: "Planes", requiresOrganization: true },
  { href: "#", icon: SmartphoneIcon, label: "Portal", disabled: true, requiresOrganization: true },
  { href: "/admin/organizations", icon: Building2Icon, label: "Organizaciones", platformRole: "admin_saas" },
  { href: "/admin/exercises", icon: ShieldCheckIcon, label: "Ejercicios globales", platformRole: "admin_saas" },
  { href: "/settings", icon: SettingsIcon, label: "Configuracion", requiresOrganization: true },
];
