"use client";

import { LaptopIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useAppTheme } from "@/components/providers/theme-provider";
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">Configuracion</p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Preferencias de la app
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Ajusta la apariencia para que el panel sea comodo durante tu
              flujo de trabajo.
            </p>
          </div>
          <span className="w-fit rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            Modo actual:{" "}
            <span className="font-medium text-foreground">
              {activeTheme ? (activeTheme === "dark" ? "Dark" : "Light") : "-"}
            </span>
          </span>
        </div>
      </header>

      <section className="rounded-xl border bg-card p-5 shadow-sm md:p-6">
        <div className="mb-5">
          <h2 className="font-semibold">Apariencia</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige entre light, dark o seguir el sistema.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedTheme === option.value;

            return (
              <button
                key={option.value}
                className={cn(
                  "flex min-h-36 flex-col items-start justify-between rounded-lg border bg-background p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "hover:border-primary/60 hover:bg-muted/30",
                )}
                type="button"
                onClick={() => setTheme(option.value)}
              >
                <span className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
