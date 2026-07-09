"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, LinkIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";
import { type Control, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogDescription,
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
import { cn } from "@/lib/utils";
import type {
  CreateExerciseInput,
  Equipment,
  PrimaryMuscle,
} from "@/hooks/use-exercises";
import { equipmentLabels, muscleLabels } from "./exercise-search-item";

const exerciseCreateSchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido"),
  primaryMuscle: z.enum([
    "chest",
    "back",
    "legs",
    "shoulder",
    "biceps",
    "triceps",
    "core",
    "glute",
  ]),
  equipment: z.enum([
    "barbell",
    "dumbbell",
    "cable",
    "machine",
    "bodyweight",
    "other",
  ]),
  instructions: z.string().trim().optional(),
  secondaryMuscles: z.string().trim().optional(),
  recommendations: z.string().trim().optional(),
  videoUrl: z.string().trim().url("URL inválida").optional().or(z.literal("")),
});

type ExerciseCreateValues = z.infer<typeof exerciseCreateSchema>;

const defaultValues: ExerciseCreateValues = {
  name: "",
  primaryMuscle: "chest",
  equipment: "dumbbell",
  instructions: "",
  secondaryMuscles: "",
  recommendations: "",
  videoUrl: "",
};

export function ExerciseCreateDialog({
  isLoading,
  isOpen,
  onCreate,
  onOpenChange,
}: {
  isLoading: boolean;
  isOpen: boolean;
  onCreate: (input: CreateExerciseInput) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<ExerciseCreateValues>({
    resolver: zodResolver(exerciseCreateSchema),
    defaultValues,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  function updateImageFile(file: File | null) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
  }

  async function submit(values: ExerciseCreateValues) {
    await onCreate({
      name: values.name.trim(),
      primaryMuscle: values.primaryMuscle,
      equipment: values.equipment,
      instructions: values.instructions?.trim(),
      recommendations: values.recommendations?.trim(),
      secondaryMuscles: values.secondaryMuscles
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      imageFile,
      videoUrl: values.videoUrl?.trim(),
    });
    updateImageFile(null);
    form.reset(defaultValues);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border !border-transparent bg-background p-0 shadow-[var(--surface-shadow)] sm:max-w-2xl">
        <Form {...form}>
          <form
            className="flex max-h-[calc(100vh-2rem)] flex-col bg-background"
            onSubmit={form.handleSubmit(submit)}
          >
            <DialogHeader className="relative overflow-hidden border-b border-border/55 bg-card/90 px-5 py-5 pr-14">
              <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Biblioteca personalizada
              </p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight">
                Nuevo ejercicio personalizado
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Crea un movimiento propio para usarlo en tus planes y sesiones.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <FormSection title="Datos básicos">
                <TextField control={form.control} label="Nombre" name="name" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    control={form.control}
                    label="Músculo principal"
                    name="primaryMuscle"
                    options={Object.entries(muscleLabels) as Array<[PrimaryMuscle, string]>}
                  />
                  <SelectField
                    control={form.control}
                    label="Equipamiento"
                    name="equipment"
                    options={Object.entries(equipmentLabels) as Array<[Equipment, string]>}
                  />
                </div>
                <TextField
                  control={form.control}
                  label="Músculos secundarios"
                  name="secondaryMuscles"
                  placeholder="Separados por coma"
                />
              </FormSection>

              <FormSection title="Guía del ejercicio">
                <TextAreaField
                  control={form.control}
                  label="Instrucciones"
                  name="instructions"
                />
                <TextAreaField
                  control={form.control}
                  label="Recomendaciones"
                  name="recommendations"
                  rows="compact"
                />
              </FormSection>

              <FormSection title="Recursos visuales">
                <ImagePicker
                  imageFile={imageFile}
                  previewUrl={previewUrl}
                  onImageFileChange={updateImageFile}
                />
                <div className="rounded-2xl border !border-transparent bg-muted/25 p-3 shadow-[var(--surface-shadow-soft)]">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <LinkIcon className="size-4 text-primary" aria-hidden="true" />
                    URL de video externo
                  </div>
                  <TextField
                    control={form.control}
                    label="URL de video externo"
                    name="videoUrl"
                  />
                </div>
              </FormSection>
            </div>

            <DialogFooter className="sticky bottom-0 border-t border-border/55 bg-card/95 px-5 py-4 backdrop-blur">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                ) : (
                  <PlusIcon data-icon="inline-start" />
                )}
                Crear ejercicio
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border !border-transparent bg-card/80 p-4 shadow-[var(--surface-shadow-soft)]">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ImagePicker({
  imageFile,
  onImageFileChange,
  previewUrl,
}: {
  imageFile: File | null;
  onImageFileChange: (file: File | null) => void;
  previewUrl: string;
}) {
  const inputId = useId();

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor={inputId}>
        Imagen principal
      </label>
      <div className="grid gap-3 rounded-2xl border !border-transparent bg-muted/25 p-3 shadow-[var(--surface-shadow-soft)] sm:grid-cols-[220px_1fr]">
        <label
          className="relative flex aspect-[16/10] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border !border-transparent bg-muted text-muted-foreground shadow-[var(--surface-shadow-soft)] transition-colors hover:bg-accent hover:text-accent-foreground"
          htmlFor={inputId}
        >
          {previewUrl ? (
            <Image
              alt=""
              className="size-full object-cover"
              fill
              sizes="(min-width: 640px) 220px, 100vw"
              src={previewUrl}
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-sm">
              <ImageIcon className="size-7" aria-hidden="true" />
              Sin imagen
            </div>
          )}
          <span className="sr-only">Seleccionar imagen</span>
        </label>
        <div className="min-w-0 flex-1">
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            id={inputId}
            type="file"
            onChange={(event) =>
              onImageFileChange(event.target.files?.[0] ?? null)
            }
          />
          <label
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border bg-card px-3 text-sm font-semibold shadow-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
            htmlFor={inputId}
          >
            Seleccionar imagen
          </label>
          <p className="mt-2 truncate text-sm text-muted-foreground">
            {imageFile ? imageFile.name : "Ningún archivo seleccionado"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPG, PNG o WebP. Máximo 2 MB.
          </p>
          {imageFile ? (
            <Button
              className="mt-3"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onImageFileChange(null)}
            >
              <XIcon data-icon="inline-start" />
              Quitar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TextField({
  control,
  label,
  name,
  placeholder,
}: {
  control: Control<ExerciseCreateValues>;
  label: string;
  name: keyof ExerciseCreateValues;
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
            <Input
              {...field}
              className="h-10 rounded-xl shadow-none"
              placeholder={placeholder}
              value={String(field.value ?? "")}
            />
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
  rows = "default",
}: {
  control: Control<ExerciseCreateValues>;
  label: string;
  name: keyof ExerciseCreateValues;
  rows?: "default" | "compact";
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
              className={cn(
                "w-full rounded-xl border bg-card px-3 py-2 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
                rows === "compact" ? "min-h-20" : "min-h-28",
              )}
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

function SelectField({
  control,
  label,
  name,
  options,
}: {
  control: Control<ExerciseCreateValues>;
  label: string;
  name: keyof ExerciseCreateValues;
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
            <select
              className="h-10 rounded-xl border bg-card px-3 text-sm shadow-none outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={String(field.value)}
              onChange={field.onChange}
            >
              {options.map(([value, optionLabel]) => (
                <option key={value} value={value}>
                  {optionLabel}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
