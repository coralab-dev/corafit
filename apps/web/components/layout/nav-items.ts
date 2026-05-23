import {
  ActivityIcon,
  DumbbellIcon,
  SmartphoneIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
};

export const navItems: AppNavItem[] = [
  { href: "/", icon: ActivityIcon, label: "Dashboard" },
  { href: "/clients", icon: UsersIcon, label: "Clientes" },
  { href: "/exercises", icon: DumbbellIcon, label: "Ejercicios" },
  { href: "/training-plans", icon: DumbbellIcon, label: "Planes" },
  { href: "#", icon: SmartphoneIcon, label: "Portal", disabled: true },
];
