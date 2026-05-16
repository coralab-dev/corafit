"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";
import { type Control, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
  videoUrl: z.string().trim().url("URL invalida").optional().or(z.literal("")),
});

type ExerciseCreateValues = z.infer<typeof exerciseCreateSchema>;

const defaultValues: ExerciseCreateValues = {
  name: "",
  primaryMuscle: "chest",
  equipment: "dumbbell",
  instructions: "",
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
      imageFile,
      videoUrl: imageFile ? undefined : values.videoUrl?.trim(),
    });
    updateImageFile(null);
    form.reset(defaultValues);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo ejercicio</DialogTitle>
          <DialogDescription>
            Crea un ejercicio personalizado sin requerir imagen.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(submit)}>
            <TextField control={form.control} label="Nombre" name="name" />
            <SelectField
              control={form.control}
              label="Musculo principal"
              name="primaryMuscle"
              options={Object.entries(muscleLabels) as Array<[PrimaryMuscle, string]>}
            />
            <SelectField
              control={form.control}
              label="Equipamiento"
              name="equipment"
              options={Object.entries(equipmentLabels) as Array<[Equipment, string]>}
            />
            <TextAreaField
              control={form.control}
              label="Instrucciones"
              name="instructions"
            />
            <ImagePicker
              imageFile={imageFile}
              previewUrl={previewUrl}
              onImageFileChange={updateImageFile}
            />
            {!imageFile ? (
              <TextField
                control={form.control}
                label="URL de video externo"
                name="videoUrl"
              />
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2Icon data-icon="inline-start" />
                ) : (
                  <PlusIcon data-icon="inline-start" />
                )}
                Crear
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
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
      <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
        <label
          className="flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          htmlFor={inputId}
        >
          {previewUrl ? (
            <Image
              alt=""
              className="size-full object-cover"
              height={80}
              src={previewUrl}
              unoptimized
              width={80}
            />
          ) : (
            <ImageIcon aria-hidden="true" />
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
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border bg-background px-3 text-sm font-semibold shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
            htmlFor={inputId}
          >
            Seleccionar imagen
          </label>
          <p className="mt-2 truncate text-sm text-muted-foreground">
            {imageFile ? imageFile.name : "Ningun archivo seleccionado"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPG, PNG o WebP. Maximo 2 MB.
          </p>
          {imageFile ? (
            <Button
              className="mt-2"
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
}: {
  control: Control<ExerciseCreateValues>;
  label: string;
  name: keyof ExerciseCreateValues;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} value={String(field.value ?? "")} />
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
}: {
  control: Control<ExerciseCreateValues>;
  label: string;
  name: keyof ExerciseCreateValues;
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
                "min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
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
              className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
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
