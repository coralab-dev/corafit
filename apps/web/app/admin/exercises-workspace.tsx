"use client";

import {
  ImageIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  UploadIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WorkspaceFrame, WorkspaceHeader, WorkspaceSplit } from "@/components/layout/workspace-shell";
import { useAuth } from "@/components/providers/auth-provider";
import {
  type AdminExerciseInput,
  type ExerciseStatus,
  useAdminExercises,
} from "@/hooks/use-admin-exercises";
import type { Equipment, Exercise, PrimaryMuscle } from "@/hooks/use-exercises";
import { cn } from "@/lib/utils";

const muscleLabels: Record<PrimaryMuscle, string> = {
  chest: "Pecho",
  back: "Espalda",
  legs: "Piernas",
  shoulder: "Hombro",
  biceps: "Biceps",
  triceps: "Triceps",
  core: "Core",
  glute: "Gluteo",
};

const equipmentLabels: Record<Equipment, string> = {
  barbell: "Barra",
  dumbbell: "Mancuerna",
  cable: "Cable",
  machine: "Maquina",
  bodyweight: "Peso corporal",
  other: "Otro",
};

const statusLabels: Record<ExerciseStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  archived: "Archivado",
};

export function AdminExercisesWorkspace() {
  const { profile, status: authStatus } = useAuth();
  const isAdmin = profile?.user.platformRole === "admin_saas";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ExerciseStatus>("active");
  const [primaryMuscle, setPrimaryMuscle] = useState<PrimaryMuscle | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [selectedId, setSelectedId] = useState("");
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const {
    createExercise,
    deactivateExercise,
    error,
    isLoading,
    items,
    removeExerciseMedia,
    total,
    updateExercise,
    uploadExerciseImage,
  } = useAdminExercises({ equipment, primaryMuscle, search, status });

  const selectedExercise = useMemo(
    () => items.find((exercise) => exercise.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  async function handleCreate(input: AdminExerciseInput) {
    const exercise = await createExercise(input);
    setSelectedId(exercise.id);
    setIsCreateOpen(false);
    toast.success("Ejercicio global creado");
  }

  async function handleUpdate(input: AdminExerciseInput) {
    if (!editingExercise) {
      return;
    }

    const exercise = await updateExercise(editingExercise.id, input);
    setSelectedId(exercise.id);
    setEditingExercise(null);
    toast.success("Ejercicio global actualizado");
  }

  if (authStatus === "loading") {
    return (
      <WorkspaceFrame
        header={<WorkspaceHeader title="Admin" description="Validando permisos." />}
      >
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Validando admin...
        </div>
      </WorkspaceFrame>
    );
  }

  if (!isAdmin) {
    return (
      <WorkspaceFrame
        header={
          <WorkspaceHeader
            title="Admin"
            description="Herramientas internas para administracion SaaS."
          />
        }
      >
        <div className="flex flex-1 items-center justify-center bg-background p-6">
          <Card className="max-w-md rounded-md shadow-none">
            <CardHeader>
              <CardTitle>Acceso denegado</CardTitle>
              <CardDescription>
                Tu usuario no tiene permisos de administrador SaaS.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          title="Admin / Ejercicios globales"
          description="Corrige la biblioteca base que todos los coaches reutilizan."
          actions={
            <Button className="shadow-none" onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="size-4" />
              Nuevo global
            </Button>
          }
        />
      }
    >
      <WorkspaceSplit
        main={
          <section className="min-w-0 bg-background p-5">
            <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_180px_160px]">
              <Input
                placeholder="Buscar ejercicio"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Select value={status} onChange={(value) => setStatus(value as ExerciseStatus)}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select
                value={primaryMuscle}
                onChange={(value) => setPrimaryMuscle(value as PrimaryMuscle | "all")}
              >
                <option value="all">Todos los musculos</option>
                {Object.entries(muscleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select
                value={equipment}
                onChange={(value) => setEquipment(value as Equipment | "all")}
              >
                <option value="all">Todo equipo</option>
                {Object.entries(equipmentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="overflow-hidden rounded-md border bg-card">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold">Biblioteca global</h2>
                  <p className="text-xs text-muted-foreground">
                    {total} ejercicios encontrados
                  </p>
                </div>
                {isLoading ? <Loader2Icon className="size-4 animate-spin text-muted-foreground" /> : null}
              </div>
              {error ? (
                <div className="border-b bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}
              <div className="divide-y">
                {items.map((exercise) => (
                  <button
                    key={exercise.id}
                    className={cn(
                      "grid w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 md:grid-cols-[minmax(0,1.5fr)_140px_140px_90px]",
                      selectedExercise?.id === exercise.id && "bg-primary/8",
                    )}
                    type="button"
                    onClick={() => setSelectedId(exercise.id)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{exercise.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {exercise.instructions || "Sin instrucciones"}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {muscleLabels[exercise.primaryMuscle]}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {equipmentLabels[exercise.equipment]}
                    </span>
                    <Badge variant={exercise.status === "active" ? "secondary" : "muted"}>
                      {statusLabels[exercise.status as ExerciseStatus] ?? exercise.status}
                    </Badge>
                  </button>
                ))}
                {!isLoading && items.length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No hay ejercicios globales con estos filtros.
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        }
        side={
          <ExerciseDetailPanel
            exercise={selectedExercise}
            onDeactivate={deactivateExercise}
            onEdit={setEditingExercise}
            onRemoveMedia={removeExerciseMedia}
            onUploadImage={uploadExerciseImage}
          />
        }
      />

      <ExerciseDialog
        isOpen={isCreateOpen}
        title="Nuevo ejercicio global"
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
      />
      {editingExercise ? (
        <ExerciseDialog
          exercise={editingExercise}
          isOpen={Boolean(editingExercise)}
          title="Editar ejercicio global"
          onOpenChange={(open) => {
            if (!open) setEditingExercise(null);
          }}
          onSubmit={handleUpdate}
        />
      ) : null}
    </WorkspaceFrame>
  );
}

function ExerciseDetailPanel({
  exercise,
  onDeactivate,
  onEdit,
  onRemoveMedia,
  onUploadImage,
}: {
  exercise: Exercise | null;
  onDeactivate: (exerciseId: string) => Promise<Exercise>;
  onEdit: (exercise: Exercise) => void;
  onRemoveMedia: (exerciseId: string) => Promise<Exercise>;
  onUploadImage: (exerciseId: string, file: File) => Promise<Exercise>;
}) {
  const [isBusy, setIsBusy] = useState(false);

  if (!exercise) {
    return (
      <aside className="p-5">
        <Card className="rounded-md shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Detalle</CardTitle>
            <CardDescription>Selecciona un ejercicio global.</CardDescription>
          </CardHeader>
        </Card>
      </aside>
    );
  }

  async function handleDeactivate() {
    if (!exercise) return;
    const confirmed = window.confirm(
      `Desactivar "${exercise.name}"? Se ocultara de busquedas nuevas.`,
    );
    if (!confirmed) return;

    setIsBusy(true);
    try {
      await onDeactivate(exercise.id);
      toast.success("Ejercicio desactivado");
    } catch (caughtError) {
      toast.error(getErrorMessage(caughtError));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file || !exercise) return;
    setIsBusy(true);
    try {
      await onUploadImage(exercise.id, file);
      toast.success("Imagen actualizada");
    } catch (caughtError) {
      toast.error(getErrorMessage(caughtError));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemoveMedia() {
    if (!exercise) return;
    setIsBusy(true);
    try {
      await onRemoveMedia(exercise.id);
      toast.success("Media eliminada");
    } catch (caughtError) {
      toast.error(getErrorMessage(caughtError));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <aside className="p-5">
      <Card className="overflow-hidden rounded-md shadow-none">
        <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden border-b bg-muted text-muted-foreground">
          {exercise.mediaUrl && exercise.mediaType === "image" ? (
            <Image
              alt=""
              className="size-full object-cover"
              fill
              sizes="420px"
              src={exercise.mediaUrl}
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-sm">
              {exercise.mediaType === "video_url" ? (
                <VideoIcon className="size-7" />
              ) : (
                <ImageIcon className="size-7" />
              )}
              {exercise.mediaType === "video_url" ? "Video externo" : "Sin imagen"}
            </div>
          )}
        </div>
        <CardHeader className="border-b p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{exercise.name}</CardTitle>
              <CardDescription className="mt-1">
                {muscleLabels[exercise.primaryMuscle]} / {equipmentLabels[exercise.equipment]}
              </CardDescription>
            </div>
            <Badge variant={exercise.status === "active" ? "secondary" : "muted"}>
              {statusLabels[exercise.status as ExerciseStatus] ?? exercise.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Musculo" value={muscleLabels[exercise.primaryMuscle]} />
            <Metric label="Equipo" value={equipmentLabels[exercise.equipment]} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="sm:flex-1"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onEdit(exercise)}
            >
              <PencilIcon className="size-4" />
              Editar
            </Button>
            <Button
              className="sm:flex-1"
              disabled={isBusy || exercise.status !== "active"}
              size="sm"
              type="button"
              variant="destructive"
              onClick={() => void handleDeactivate()}
            >
              {isBusy ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
              Desactivar
            </Button>
          </div>
          <section className="border-t pt-4">
            <p className="text-sm font-semibold">Media</p>
            <div className="mt-3 flex flex-col gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-semibold shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                <UploadIcon className="size-4" />
                Subir imagen
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={isBusy}
                  type="file"
                  onChange={(event) => {
                    void handleUpload(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <Button
                disabled={isBusy || !exercise.mediaUrl}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => void handleRemoveMedia()}
              >
                <XIcon className="size-4" />
                Quitar media
              </Button>
            </div>
          </section>
          <TextBlock label="Instrucciones" value={exercise.instructions} />
          <TextBlock label="Recomendaciones" value={exercise.recommendations} />
        </CardContent>
      </Card>
    </aside>
  );
}

function ExerciseDialog({
  exercise,
  isOpen,
  onOpenChange,
  onSubmit,
  title,
}: {
  exercise?: Exercise;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AdminExerciseInput) => Promise<void>;
  title: string;
}) {
  const [equipment, setEquipment] = useState<Equipment>(exercise?.equipment ?? "bodyweight");
  const [instructions, setInstructions] = useState(exercise?.instructions ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(exercise?.name ?? "");
  const [primaryMuscle, setPrimaryMuscle] = useState<PrimaryMuscle>(exercise?.primaryMuscle ?? "chest");
  const [recommendations, setRecommendations] = useState(exercise?.recommendations ?? "");
  const [secondaryMuscles, setSecondaryMuscles] = useState(
    exercise?.secondaryMuscles.join(", ") ?? "",
  );
  const [videoUrl, setVideoUrl] = useState(
    exercise?.mediaType === "video_url" ? exercise.mediaUrl ?? "" : "",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres");
      return;
    }

    const trimmedVideoUrl = videoUrl.trim();
    if (trimmedVideoUrl && !isValidUrl(trimmedVideoUrl)) {
      toast.error("La URL de video no es valida");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        equipment,
        instructions: instructions.trim() || null,
        mediaType: trimmedVideoUrl ? "video_url" : exercise?.mediaType === "video_url" ? null : undefined,
        mediaUrl: trimmedVideoUrl || (exercise?.mediaType === "video_url" ? null : undefined),
        name: trimmedName,
        primaryMuscle,
        recommendations: recommendations.trim() || null,
        secondaryMuscles: secondaryMuscles
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      });
    } catch (caughtError) {
      toast.error(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Estos cambios aplican a la biblioteca global de CoraFit.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Nombre
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Musculo principal
              <Select
                value={primaryMuscle}
                onChange={(value) => setPrimaryMuscle(value as PrimaryMuscle)}
              >
                {Object.entries(muscleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Equipo
              <Select
                value={equipment}
                onChange={(value) => setEquipment(value as Equipment)}
              >
                {Object.entries(equipmentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Musculos secundarios
            <Input
              placeholder="Separados por coma"
              value={secondaryMuscles}
              onChange={(event) => setSecondaryMuscles(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Instrucciones
            <textarea
              className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Recomendaciones
            <textarea
              className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
              value={recommendations}
              onChange={(event) => setRecommendations(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            URL de video externo
            <Input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} />
          </label>
          <DialogFooter>
            <Button
              disabled={isSaving}
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function Select({
  children,
  onChange,
  value,
}: {
  children: React.ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <section className="border-t pt-4">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {value || "Sin datos registrados."}
      </p>
    </section>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado";
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
