"use client";

import {
  AlertCircleIcon,
  ArchiveIcon,
  CheckCircle2Icon,
  CopyIcon,
  EditIcon,
  Loader2Icon,
  MoreVerticalIcon,
  SaveIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TrainingPlan } from "@/hooks/use-training-plans";
import { cn } from "@/lib/utils";
import {
  getEditorContext,
  getSaveStateLabel,
  type SaveState,
} from "./training-plan-editor-utils";

const levelLabels: Record<string, string> = {
  advanced: "Avanzado",
  beginner: "Principiante",
  intermediate: "Intermedio",
};

const statusLabels = {
  active: "Activo",
  archived: "Archivado",
  draft: "Borrador",
};

export function TrainingPlanEditorHeader({
  exerciseCount,
  isBusy,
  onArchivePlan,
  onDuplicatePlan,
  onEditInformation,
  onPublish,
  onSave,
  onUnpublish,
  plan,
  publishState,
  saveState,
  sessionCount,
}: {
  exerciseCount: number;
  isBusy: boolean;
  onArchivePlan: () => void;
  onDuplicatePlan: () => void;
  onEditInformation: () => void;
  onPublish: () => void;
  onSave: () => void;
  onUnpublish: () => void;
  plan: TrainingPlan;
  publishState: SaveState;
  saveState: SaveState;
  sessionCount: number;
}) {
  const context = getEditorContext(plan);
  const isPublishing = publishState === "saving";
  const isSaving = saveState === "saving";

  const primaryAction = {
    "duplicate-archived": {
      icon: CopyIcon,
      label: "Duplicar para editar",
      onClick: onDuplicatePlan,
      variant: "default" as const,
    },
    "duplicate-template": {
      icon: CopyIcon,
      label: "Copiar para editar",
      onClick: onDuplicatePlan,
      variant: "default" as const,
    },
    publish: {
      icon: CheckCircle2Icon,
      label: "Publicar",
      onClick: onPublish,
      variant: "default" as const,
    },
    unpublish: {
      icon: ArchiveIcon,
      label: "Despublicar",
      onClick: onUnpublish,
      variant: "outline" as const,
    },
  }[context.primaryAction];
  const PrimaryIcon = primaryAction.icon;

  return (
    <header className="border-b bg-background/90 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <nav aria-label="Migas de pan" className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <Link className="transition-colors hover:text-foreground" href="/training-plans">
              Planes
            </Link>
            <span aria-hidden="true">/</span>
            <span className="truncate">{plan.name}</span>
          </nav>
          <h1 className="mt-2 text-2xl font-bold tracking-normal">{context.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{plan.goal || "Sin objetivo"}</span>
            <span aria-hidden="true">·</span>
            <span>{plan.level ? (levelLabels[plan.level] ?? plan.level) : "Sin nivel"}</span>
            <span aria-hidden="true">·</span>
            <span>{plan.durationWeeks} semanas</span>
            <span aria-hidden="true">·</span>
            <span>{sessionCount} sesiones</span>
            <span aria-hidden="true">·</span>
            <span>{exerciseCount} ejercicios</span>
            <span aria-hidden="true">·</span>
            <Badge
              variant={
                plan.status === "active"
                  ? "success"
                  : plan.status === "draft"
                    ? "warning"
                    : "muted"
              }
            >
              {statusLabels[plan.status]}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {context.isReadOnly ? <Badge variant="muted">Sólo lectura</Badge> : <SaveStatusChip state={saveState} />}
          <Button
            disabled={isBusy}
            type="button"
            variant={primaryAction.variant}
            onClick={primaryAction.onClick}
          >
            {isPublishing ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <PrimaryIcon data-icon="inline-start" />
            )}
            {primaryAction.label}
          </Button>
          <Button disabled={isBusy && !context.isReadOnly} type="button" variant="outline" onClick={onEditInformation}>
            <EditIcon data-icon="inline-start" />
            {context.isReadOnly ? "Ver información" : "Editar información"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Más acciones del plan" size="icon" type="button" variant="outline">
                <MoreVerticalIcon aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-xl border !border-transparent shadow-[var(--surface-shadow-soft)]"
            >
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={onEditInformation}>
                  <EditIcon data-icon="inline-start" />
                  {context.isReadOnly ? "Ver información" : "Editar información"}
                </DropdownMenuItem>
                {!context.isReadOnly ? <DropdownMenuItem
                  disabled={isBusy || isSaving}
                  onSelect={onSave}
                >
                  {isSaving ? (
                    <Loader2Icon className="animate-spin" data-icon="inline-start" />
                  ) : (
                    <SaveIcon data-icon="inline-start" />
                  )}
                  Guardar ahora
                </DropdownMenuItem> : null}
                <DropdownMenuItem disabled={isBusy} onSelect={onDuplicatePlan}>
                  <CopyIcon data-icon="inline-start" />
                  Duplicar plan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={Boolean(plan.isSystemTemplate) || plan.status === "archived" || isBusy}
                  onSelect={onArchivePlan}
                >
                  <ArchiveIcon data-icon="inline-start" />
                  Archivar plan
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function SaveStatusChip({ state }: { state: SaveState }) {
  const isError = state === "error";
  const isPending = state === "dirty";
  const isSaving = state === "saving";
  const Icon = isError ? AlertCircleIcon : isSaving ? Loader2Icon : isPending ? SaveIcon : CheckCircle2Icon;

  return (
    <span
      aria-atomic="true"
      aria-live="polite"
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold",
        isError && "border-destructive/25 bg-destructive/5 text-destructive",
        isPending && "border-amber-500/25 bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
        isSaving && "border-sky-500/25 bg-sky-50 text-sky-700 dark:bg-sky-950/45 dark:text-sky-300",
        !isError && !isPending && !isSaving && "border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300",
      )}
    >
      <Icon className={cn("size-4", isSaving && "animate-spin")} aria-hidden="true" />
      {getSaveStateLabel(state)}
    </span>
  );
}
