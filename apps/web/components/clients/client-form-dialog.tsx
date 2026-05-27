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
        className="max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-[min(1120px,calc(100vw-3rem))]"
        overlayClassName="bg-black/70 backdrop-blur-sm"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="bg-background text-foreground">
          <Form {...form}>
            <form
              className="flex max-h-[calc(100vh-2rem)] flex-col"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <header className="border-b bg-card px-5 py-4 lg:px-6">
                <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase text-primary">
                      Clientes
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight">
                      {title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Perfil operativo, datos base y permisos del cliente.
                    </p>
                  </div>
                  <span className="w-fit rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                    {isCreate ? "Creacion" : "Edicion"}
                  </span>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-6">
                  <div className="overflow-hidden rounded-md border bg-card">
                    <FormSection eyebrow="01" title="Datos basicos">
                      <div className="grid gap-3 lg:grid-cols-2">
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
                    </FormSection>

                    <FormSection eyebrow="02" title="Datos opcionales">
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

                    <FormSection compact eyebrow="03" title="Configuracion">
                      <FormField
                        control={form.control}
                        name="canRegisterWeight"
                        render={({ field }) => (
                          <FormItem>
                            <div className="rounded-md border bg-background px-3 py-3">
                              <div className="flex items-start gap-3">
                                <FormControl>
                                  <button
                                    aria-pressed={field.value}
                                    className={cn(
                                      "mt-0.5 flex h-6 w-11 rounded-full border p-0.5 transition-colors",
                                      field.value
                                        ? "justify-end bg-primary"
                                        : "justify-start bg-muted",
                                    )}
                                    type="button"
                                    onClick={() => field.onChange(!field.value)}
                                  >
                                    <span className="size-4 rounded-full bg-background shadow-sm" />
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

                  <aside className="h-fit rounded-md border bg-card lg:sticky lg:top-4">
                    <div className="border-b px-4 py-4">
                      <h3 className="text-sm font-semibold">Lo obligatorio</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Completa estos campos para crear el perfil.
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
                    <div className="border-t p-4">
                      <p className="text-sm font-semibold">Siguiente paso</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Despues podras asignar un plan y generar acceso para tu
                        cliente.
                      </p>
                    </div>
                  </aside>
                </div>
              </div>

              <DialogFooter className="border-t bg-card px-5 py-3 sm:justify-between lg:px-6">
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
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  compact?: boolean;
  eyebrow: string;
  title: string;
}) {
  return (
    <section
      className={cn(
        "space-y-3 border-b px-4 py-4 last:border-b-0",
        compact && "bg-background/40",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-xs font-semibold text-primary">
          {eyebrow}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
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
            <div className="grid grid-cols-1 overflow-hidden rounded-md border bg-background sm:grid-cols-3">
              {options.map(([value, label, Icon]) => (
                <button
                  key={value}
                  className={cn(
                    "flex h-9 items-center justify-center gap-2 border-b px-2 text-sm transition-colors last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0",
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
                className={cn("h-9 shadow-none", suffix ? "rounded-r-none" : "")}
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
                <div className="flex h-9 items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm font-medium text-muted-foreground">
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
              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
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
                className="h-9 w-full appearance-none rounded-md border bg-background px-3 pr-9 text-sm shadow-none outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
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
