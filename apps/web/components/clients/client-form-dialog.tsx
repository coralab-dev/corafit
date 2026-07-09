"use client";

import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  InfoIcon,
  LaptopIcon,
  Loader2Icon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import type { Control, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { levelLabels, type ClientFormValues } from "@/lib/clients/api";
import { cn } from "@/lib/utils";

export function ClientFormDialog({
  form,
  isLoading,
  isOpen,
  mode,
  onOpenChange,
  onSubmit,
}: {
  form: UseFormReturn<ClientFormValues>;
  isLoading: boolean;
  isOpen: boolean;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ClientFormValues) => void;
}) {
  const isCreate = mode === "create";
  const title = isCreate ? "Nuevo cliente" : "Editar cliente";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border !border-transparent bg-background p-0 shadow-[var(--surface-shadow)] sm:max-w-[min(1180px,calc(100vw-3rem))]"
        overlayClassName="bg-black/70 backdrop-blur-sm"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="bg-background text-foreground">
          <Form {...form}>
            <form
              className="flex max-h-[calc(100vh-2rem)] flex-col"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <header className="border-b border-border/60 bg-card/90 px-5 py-5 backdrop-blur lg:px-6">
                <div className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-primary">
                      Clientes
                    </p>
                    <h2 className="mt-1 text-2xl font-bold tracking-normal">
                      {title}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Perfil operativo, datos base y permisos del cliente.
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-border/55 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    {isCreate ? "Creacion" : "Edicion"}
                  </span>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="grid gap-4 px-4 py-4 lg:grid-cols-[160px_minmax(0,1fr)_280px] lg:px-6">
                  <aside className="hidden h-fit rounded-2xl border !border-transparent bg-card p-3 shadow-[var(--surface-shadow-soft)] lg:sticky lg:top-4 lg:block">
                    <p className="px-2 pb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Secciones
                    </p>
                    <div className="space-y-1">
                      <StepPill index="01" label="Base" />
                      <StepPill index="02" label="Perfil" />
                      <StepPill index="03" label="Permisos" />
                    </div>
                  </aside>

                  <div className="space-y-4">
                    <FormSection
                      description="Datos que identifican al cliente dentro de tu operacion."
                      eyebrow="01"
                      title="Datos basicos"
                    >
                      <div className="grid gap-3 xl:grid-cols-2">
                        <TextField
                          control={form.control}
                          label="Nombre completo"
                          name="name"
                          placeholder="Ej. Juan Perez Garcia"
                          required
                        />
                        <ClientTypeField control={form.control} />
                        <TextField
                          control={form.control}
                          label="Objetivo principal"
                          name="mainGoal"
                          placeholder="Ej. Fuerza general"
                          required
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <TextField
                            control={form.control}
                            label="Estatura"
                            name="heightCm"
                            placeholder="Ej. 175"
                            required
                            suffix="cm"
                            type="number"
                          />
                          <TextField
                            control={form.control}
                            label="Peso inicial"
                            name="initialWeightKg"
                            placeholder="Ej. 72.5"
                            required
                            suffix="kg"
                            type="number"
                          />
                        </div>
                      </div>
                    </FormSection>

                    <FormSection
                      description="Informacion util para personalizar planes y seguimiento."
                      eyebrow="02"
                      title="Perfil operativo"
                    >
                      <div className="grid gap-3 md:grid-cols-3">
                        <TextField
                          control={form.control}
                          label="Telefono"
                          name="phone"
                          placeholder="Ej. +52 55 1234 5678"
                        />
                        <TextField
                          control={form.control}
                          label="Edad"
                          name="age"
                          placeholder="Ej. 28"
                          type="number"
                        />
                        <SelectField
                          control={form.control}
                          label="Sexo"
                          name="sex"
                          options={[
                            ["", "Selecciona"],
                            ["female", "Femenino"],
                            ["male", "Masculino"],
                            ["other", "Otro"],
                          ]}
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-[0.9fr_1.4fr]">
                        <SelectField
                          control={form.control}
                          label="Nivel"
                          name="trainingLevel"
                          options={[
                            ["", "Sin nivel"],
                            ["beginner", levelLabels.beginner],
                            ["intermediate", levelLabels.intermediate],
                            ["advanced", levelLabels.advanced],
                          ]}
                        />
                        <TextField
                          control={form.control}
                          label="Lesiones o molestias"
                          name="injuriesNotes"
                          placeholder="Describe si tiene lesiones o molestias actuales"
                        />
                      </div>
                      <TextAreaField
                        control={form.control}
                        label="Notas generales"
                        name="generalNotes"
                        placeholder="Observaciones adicionales sobre el cliente, habitos, horarios o antecedentes."
                      />
                    </FormSection>

                    <FormSection
                      compact
                      description="Permisos que controlan lo que el cliente puede registrar."
                      eyebrow="03"
                      title="Configuracion"
                    >
                      <FormField
                        control={form.control}
                        name="canRegisterWeight"
                        render={({ field }) => (
                          <FormItem>
                            <div className="rounded-2xl border !border-transparent bg-background px-4 py-4 shadow-[var(--surface-shadow-soft)]">
                              <div className="flex items-start gap-4">
                                <FormControl>
                                  <button
                                    aria-pressed={field.value}
                                    className={cn(
                                      "mt-0.5 flex h-7 w-12 rounded-full border border-border/60 p-0.5 transition-colors",
                                      field.value
                                        ? "justify-end bg-primary"
                                        : "justify-start bg-muted",
                                    )}
                                    type="button"
                                    onClick={() => field.onChange(!field.value)}
                                  >
                                    <span className="size-5 rounded-full bg-background shadow-sm" />
                                  </button>
                                </FormControl>
                                <div>
                                  <FormLabel>
                                    Permitir que el cliente registre su peso
                                  </FormLabel>
                                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                    El cliente podra registrar su peso desde su
                                    app o portal.
                                    <InfoIcon className="size-3.5" />
                                  </p>
                                </div>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </FormSection>
                  </div>

                  <aside className="h-fit overflow-hidden rounded-2xl border !border-transparent bg-card shadow-[var(--surface-shadow)] lg:sticky lg:top-4">
                    <div className="border-b border-border/60 px-4 py-4">
                      <h3 className="text-sm font-semibold">Lo obligatorio</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Completa estos campos para guardar el perfil.
                      </p>
                    </div>
                    <div className="space-y-3 p-4 text-sm text-muted-foreground">
                      {[
                        "Nombre completo",
                        "Tipo de cliente",
                        "Objetivo principal",
                        "Estatura",
                        "Peso inicial",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2.5">
                          <CheckCircle2Icon className="size-4 text-primary" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border/60 bg-secondary/45 p-4">
                      <p className="text-sm font-semibold">Siguiente paso</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Despues podras asignar un plan y generar acceso para tu
                        cliente.
                      </p>
                    </div>
                  </aside>
                </div>
              </div>

              <DialogFooter className="border-t border-border/60 bg-card/90 px-5 py-3 backdrop-blur sm:justify-between lg:px-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <p className="hidden text-xs text-muted-foreground md:block">
                    Despues podras asignar plan y generar acceso.
                  </p>
                  <Button className="min-w-48" disabled={isLoading} type="submit">
                    {isLoading ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : null}
                    {isCreate ? "Guardar cliente" : "Guardar cambios"}
                    {!isLoading ? <ArrowRightIcon className="size-4" /> : null}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({
  children,
  compact,
  description,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  compact?: boolean;
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border !border-transparent bg-card p-4 shadow-[var(--surface-shadow)]",
        compact && "bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border !border-transparent bg-accent text-xs font-semibold text-primary shadow-[var(--surface-shadow-soft)]">
          {eyebrow}
        </span>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function StepPill({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground">
      <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-xs font-semibold text-primary">
        {index}
      </span>
      {label}
    </div>
  );
}

function ClientTypeField({ control }: { control: Control<ClientFormValues> }) {
  const options = [
    ["presential", "Presencial", UserIcon],
    ["online", "Online", LaptopIcon],
    ["hybrid", "Hibrido", UsersIcon],
  ] as const;

  return (
    <FormField
      control={control}
      name="clientType"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Tipo de cliente <span className="text-primary">*</span>
          </FormLabel>
          <FormControl>
            <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border/60 bg-background sm:grid-cols-3">
              {options.map(([value, label, Icon]) => (
                <button
                  key={value}
                  className={cn(
                    "flex h-10 items-center justify-center gap-2 border-b border-border/60 px-2 text-sm transition-colors last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0",
                    field.value === value
                      ? "bg-primary/10 font-semibold text-primary ring-1 ring-inset ring-primary/45"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                  type="button"
                  onClick={() => field.onChange(value)}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TextField({
  control,
  label,
  name,
  placeholder,
  required,
  suffix,
  type = "text",
}: {
  control: Control<ClientFormValues>;
  label: string;
  name: keyof ClientFormValues & string;
  placeholder?: string;
  required?: boolean;
  suffix?: string;
  type?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label} {required ? <span className="text-primary">*</span> : null}
          </FormLabel>
          <FormControl>
            <div className="flex">
              <Input
                {...field}
                className={cn("h-10 shadow-none", suffix ? "rounded-r-none" : "")}
                placeholder={placeholder}
                type={type}
                value={
                  type === "number" && Number.isNaN(field.value)
                    ? ""
                    : String(field.value ?? "")
                }
                onChange={(event) =>
                  field.onChange(
                    type === "number"
                      ? event.target.valueAsNumber
                      : event.target.value,
                  )
                }
              />
              {suffix ? (
                <div className="flex h-10 items-center rounded-r-xl border border-l-0 bg-muted px-3 text-sm font-medium text-muted-foreground">
                  {suffix}
                </div>
              ) : null}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function TextAreaField({
  control,
  label,
  name,
  placeholder,
}: {
  control: Control<ClientFormValues>;
  label: string;
  name: keyof ClientFormValues & string;
  placeholder?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <textarea
              className="min-h-24 w-full rounded-xl border bg-card px-3 py-2 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
              placeholder={placeholder}
              value={String(field.value ?? "")}
              onChange={field.onChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function SelectField({
  control,
  label,
  name,
  options,
}: {
  control: Control<ClientFormValues>;
  label: string;
  name: keyof ClientFormValues & string;
  options: Array<[string, string]>;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <select
                aria-label={label}
                className="h-10 w-full appearance-none rounded-xl border bg-card px-3 pr-9 text-sm shadow-none outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                value={String(field.value ?? "")}
                onChange={field.onChange}
              >
                {options.map(([value, optionLabel]) => (
                  <option key={value} value={value}>
                    {optionLabel}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
