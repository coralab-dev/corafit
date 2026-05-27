"use client";

import { LaptopIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useAppTheme } from "@/components/providers/theme-provider";
import {
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/layout/workspace-shell";
import { cn } from "@/lib/utils";

type ThemeOption = {
  description: string;
  icon: LucideIcon;
  label: string;
  value: "light" | "dark" | "system";
};

const themeOptions: ThemeOption[] = [
  {
    description: "Interfaz clara para espacios con mucha luz.",
    icon: SunIcon,
    label: "Light",
    value: "light",
  },
  {
    description: "Interfaz oscura para sesiones largas de trabajo.",
    icon: MoonIcon,
    label: "Dark",
    value: "dark",
  },
  {
    description: "Usa automaticamente el tema del dispositivo.",
    icon: LaptopIcon,
    label: "Sistema",
    value: "system",
  },
];

export function SettingsWorkspace() {
  const { resolvedTheme, setTheme, theme } = useAppTheme();
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const selectedTheme = isMounted ? theme : "system";
  const activeTheme = isMounted ? resolvedTheme : undefined;

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          title="Configuracion"
          description="Ajusta preferencias del workspace y del panel operativo."
          actions={
            <span className="w-fit rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            Modo actual:{" "}
              <span className="font-medium text-foreground">
                {activeTheme ? (activeTheme === "dark" ? "Dark" : "Light") : "-"}
              </span>
            </span>
          }
        />
      }
    >
      <div className="flex flex-1 flex-col gap-4 bg-background px-4 py-4 md:px-6">
        <WorkspacePanel
          description="Elige entre tema claro, oscuro o seguir el sistema."
          title="Preferencias de la app"
        >
          <div className="grid gap-3 p-4 lg:grid-cols-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedTheme === option.value;

              return (
                <button
                  key={option.value}
                  className={cn(
                    "flex min-h-28 items-start gap-3 rounded-md border bg-card p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25",
                    isSelected
                      ? "border-primary/45 bg-primary/5 text-foreground"
                      : "hover:border-primary/35 hover:bg-background",
                  )}
                  type="button"
                  onClick={() => setTheme(option.value)}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground",
                      isSelected && "border-primary/30 text-primary",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold">
                      {option.label}
                      {isSelected ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          Activo
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          description="Mas preferencias del workspace se agregaran aqui conforme avance el producto."
          title="Workspace"
        >
          <div className="grid gap-3 p-4 md:grid-cols-2">
            <div className="rounded-md border bg-card px-4 py-3">
              <p className="text-sm font-medium">Tema guardado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedTheme === "system"
                  ? "Siguiendo el sistema"
                  : selectedTheme === "dark"
                    ? "Oscuro"
                    : "Claro"}
              </p>
            </div>
            <div className="rounded-md border bg-card px-4 py-3">
              <p className="text-sm font-medium">Resolucion actual</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTheme ? (activeTheme === "dark" ? "Dark" : "Light") : "-"}
              </p>
            </div>
          </div>
        </WorkspacePanel>
      </div>
    </WorkspaceFrame>
  );
}
