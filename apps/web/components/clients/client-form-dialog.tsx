"use client";

import { ArrowRightIcon, CheckCircle2Icon, ChevronDownIcon, ClipboardListIcon, InfoIcon, LaptopIcon, Loader2Icon, UserIcon, UsersIcon } from "lucide-react";
import type { Control, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { levelLabels, type ClientFormValues } from "@/lib/clients/api";

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
        hideCloseButton
        overlayClassName="bg-black/70 backdrop-blur-sm"
        className="max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-[min(1280px,calc(100vw-3rem))]"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="bg-background">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 px-5 pb-4 pt-5 lg:grid-cols-[1fr_320px] lg:px-6">
                <div className="rounded-xl border bg-card/70 p-4">
                  <FormSection title="1. Datos basicos">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <TextField
                        control={form.control}
                        name="name"
                        label="Nombre completo"
                        placeholder="Ej. Juan Perez Garcia"
                        required
                      />
                      <ClientTypeField control={form.control} />
                      <TextField
                        control={form.control}
                        name="mainGoal"
                        label="Objetivo principal"
                        placeholder="Ej. Fuerza general"
                        required
                      />
                      <TextField
                        control={form.control}
                        name="heightCm"
                        label="Estatura"
                        placeholder="Ej. 175"
                        suffix="cm"
                        type="number"
                        required
                      />
                      <TextField
                        control={form.control}
                        name="initialWeightKg"
                        label="Peso inicial"
                        placeholder="Ej. 72.5"
                        suffix="kg"
                        type="number"
                        required
                      />
                    </div>
                  </FormSection>

                  <FormSection title="2. Datos opcionales">
                    <div className="grid gap-3 md:grid-cols-3">
                      <TextField
                        control={form.control}
                        name="phone"
                        label="Telefono"
                        placeholder="Ej. +52 55 1234 5678"
                      />
                      <TextField
                        control={form.control}
                        name="age"
                        label="Edad"
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
                        name="trainingLevel"
                        label="Nivel"
                        options={[
                          ["", "Sin nivel"],
                          ["beginner", levelLabels.beginner],
                          ["intermediate", levelLabels.intermediate],
                          ["advanced", levelLabels.advanced],
                        ]}
                      />
                      <TextField
                        control={form.control}
                        name="injuriesNotes"
                        label="Lesiones o molestias"
                        placeholder="Describe si tiene lesiones o molestias actuales"
                      />
                    </div>
                    <TextAreaField
                      control={form.control}
                      name="generalNotes"
                      label="Notas generales"
                      placeholder="Observaciones adicionales sobre el cliente, habitos, horarios o antecedentes."
                    />
                  </FormSection>

                  <FormSection title="3. Configuracion" compact>
                    <FormField
                      control={form.control}
                      name="canRegisterWeight"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-start gap-3">
                            <FormControl>
                              <button
                                type="button"
                                aria-pressed={field.value}
                                className={cn(
                                  "mt-0.5 flex h-6 w-11 rounded-full border p-0.5 transition-colors",
                                  field.value ? "justify-end bg-primary" : "justify-start bg-muted",
                                )}
                                onClick={() => field.onChange(!field.value)}
                              >
                                <span className="size-4 rounded-full bg-background shadow-sm" />
                              </button>
                            </FormControl>
                            <div>
                              <FormLabel>Permitir que el cliente registre su peso</FormLabel>
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                El cliente podra registrar su peso desde su app o portal.
                                <InfoIcon className="size-3.5" />
                              </p>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FormSection>
                </div>

                <aside className="h-fit rounded-xl border bg-card/70 p-4">
                  <h3 className="font-semibold text-primary">Lo obligatorio para empezar</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Completa estos campos para crear el perfil.
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    {["Nombre completo", "Tipo de cliente", "Objetivo principal", "Estatura", "Peso inicial"].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <CheckCircle2Icon className="size-5 text-primary" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="my-4 border-t" />
                  <div className="flex gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary">
                      <ClipboardListIcon className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-primary">Siguiente paso</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Despues podras asignar un plan y generar acceso para tu cliente.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

              <DialogFooter className="border-t bg-background/95 px-5 py-3 backdrop-blur sm:justify-between lg:px-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <p className="hidden text-xs text-muted-foreground md:block">
                    Despues podras asignar plan y generar acceso.
                  </p>
                  <Button className="min-w-48" type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2Icon className="size-4 animate-spin" /> : null}
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
  title,
}: {
  children: React.ReactNode;
  compact?: boolean;
  title: string;
}) {
  return (
    <section className={cn("space-y-3", compact ? "mt-4" : "mb-5")}>
      <div className="flex items-center gap-4">
        <h3 className="shrink-0 text-sm font-semibold text-primary">{title}</h3>
        <div className="h-px flex-1 bg-border" />
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
          <FormLabel>Tipo de cliente <span className="text-primary">*</span></FormLabel>
          <FormControl>
            <div className="grid grid-cols-3 overflow-hidden rounded-md border bg-background">
              {options.map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "flex h-9 items-center justify-center gap-2 border-r px-2 text-sm transition-colors last:border-r-0",
                    field.value === value
                      ? "bg-primary/10 font-semibold text-primary ring-1 ring-inset ring-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
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
                className={cn("h-9", suffix ? "rounded-r-none" : "")}
                placeholder={placeholder}
                type={type}
                value={type === "number" && Number.isNaN(field.value) ? "" : String(field.value ?? "")}
                onChange={(event) =>
                  field.onChange(
                    type === "number" ? event.target.valueAsNumber : event.target.value,
                  )
                }
              />
              {suffix ? (
                <div className="flex h-9 items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm font-semibold">
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
              className="min-h-11 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
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
                className="h-9 w-full appearance-none rounded-md border bg-background px-3 pr-9 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
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
