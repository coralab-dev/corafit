"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { CameraIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { WorkspacePanel } from "@/components/layout/workspace-shell";
import { formatDate, getInitialApiConfig } from "@/lib/clients/api";
import { cn } from "@/lib/utils";
import { resolveClientProgressLayout } from "./client-progress-layout";
import {
  getProgressErrorMessage,
  progressFormDataRequest,
  progressRequest,
  type BodyMeasurementInput,
  type BodyMeasurementLog,
  type FollowUpNote,
  type FollowUpNoteInput,
  type ProgressPhoto,
  type ProgressPhotoType,
  type WeightLog,
  type WeightLogInput,
} from "@/lib/progress/api";

type ProgressTab = "weight" | "measurements" | "photos" | "notes";
type ProgressVariant = "drawer" | "page";
type ProgressError = {
  kind: "load" | "action";
  message: string;
} | null;
type DeleteTarget =
  | { kind: "weight"; id: string }
  | { kind: "measurement"; id: string }
  | { kind: "photo"; id: string }
  | { kind: "note"; id: string };

const tabs: Array<{ key: ProgressTab; label: string; cta: string }> = [
  { key: "weight", label: "Peso", cta: "Registrar peso" },
  { key: "measurements", label: "Medidas", cta: "Registrar medidas" },
  { key: "photos", label: "Fotos", cta: "Subir foto" },
  { key: "notes", label: "Notas", cta: "Añadir nota" },
];

const photoTypeLabels: Record<ProgressPhotoType, string> = {
  back: "Espalda",
  front: "Frente",
  other: "Otra",
  side: "Lado",
};

const measurementFields = [
  ["waistCm", "Cintura"],
  ["hipCm", "Cadera"],
  ["chestCm", "Pecho"],
  ["armCm", "Brazo"],
  ["legCm", "Pierna"],
  ["gluteCm", "Glúteo"],
] as const;

export function ClientProgressPanel({
  clientId,
  variant = "drawer",
}: {
  clientId: string;
  variant?: ProgressVariant;
}) {
  const config = useMemo(() => getInitialApiConfig(), []);
  const isDrawer = variant === "drawer";
  const [activeTab, setActiveTab] = useState<ProgressTab>("weight");
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurementLog[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [notes, setNotes] = useState<FollowUpNote[]>([]);
  const [loadedTabs, setLoadedTabs] = useState<Set<ProgressTab>>(() => new Set());
  const [loadingTabs, setLoadingTabs] = useState<Record<ProgressTab, boolean>>({
    measurements: false,
    notes: false,
    photos: false,
    weight: false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<ProgressTab, ProgressError>>({
    measurements: null,
    notes: null,
    photos: null,
    weight: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const requestIdsRef = useRef<Record<ProgressTab, number>>({
    measurements: 0,
    notes: 0,
    photos: 0,
    weight: 0,
  });
  const [openForms, setOpenForms] = useState<Record<ProgressTab, boolean>>({
    measurements: false,
    notes: false,
    photos: false,
    weight: false,
  });

  const isFormOpen = openForms[activeTab];

  const loadTab = useCallback(
    async (tab: ProgressTab, force = false) => {
      if (!force && loadedTabs.has(tab)) return;
      const requestId = requestIdsRef.current[tab] + 1;
      requestIdsRef.current[tab] = requestId;
      setLoadingTabs((current) => ({ ...current, [tab]: true }));
      setErrors((current) => ({ ...current, [tab]: null }));
      try {
        let nextData:
          | WeightLog[]
          | BodyMeasurementLog[]
          | ProgressPhoto[]
          | FollowUpNote[];

        if (tab === "weight") {
          nextData = await progressRequest(
            `/progress/clients/${clientId}/weight-logs`,
            { method: "GET" },
            config,
          );
        } else if (tab === "measurements") {
          nextData = await progressRequest(
            `/progress/clients/${clientId}/body-measurements`,
            { method: "GET" },
            config,
          );
        } else if (tab === "photos") {
          nextData = await progressRequest(
            `/progress/clients/${clientId}/photos`,
            { method: "GET" },
            config,
          );
        } else {
          nextData = await progressRequest(
            `/progress/clients/${clientId}/notes`,
            { method: "GET" },
            config,
          );
        }

        if (requestIdsRef.current[tab] !== requestId) return;

        if (tab === "weight") {
          setWeightLogs(nextData as WeightLog[]);
        } else if (tab === "measurements") {
          setMeasurements(nextData as BodyMeasurementLog[]);
        } else if (tab === "photos") {
          setPhotos(nextData as ProgressPhoto[]);
        } else {
          setNotes(nextData as FollowUpNote[]);
        }
        setLoadedTabs((current) => new Set(current).add(tab));
      } catch (caught) {
        if (requestIdsRef.current[tab] !== requestId) return;
        setErrors((current) => ({
          ...current,
          [tab]: { kind: "load", message: getProgressErrorMessage(caught) },
        }));
      } finally {
        if (requestIdsRef.current[tab] === requestId) {
          setLoadingTabs((current) => ({ ...current, [tab]: false }));
        }
      }
    },
    [clientId, config, loadedTabs],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTab(activeTab);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, loadTab]);

  function openForm(tab: ProgressTab) {
    setOpenForms((current) => ({ ...current, [tab]: true }));
  }

  function closeForm(tab: ProgressTab) {
    setOpenForms((current) => ({ ...current, [tab]: false }));
  }

  function selectTab(tab: ProgressTab) {
    setActiveTab(tab);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.key === activeTab);
    const lastIndex = tabs.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    }

    if (event.key === "ArrowLeft") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    }

    if (event.key === "Home") {
      nextIndex = 0;
    }

    if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) {
      return;
    }

    const nextTab = tabs[nextIndex].key;

    event.preventDefault();
    selectTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(`client-progress-${nextTab}-tab`)?.focus();
    });
  }

  async function deleteSelected() {
    if (!deleteTarget) return;
    setSaving(true);
    setErrors((current) => ({ ...current, [activeTab]: null }));
    try {
      const base = `/progress/clients/${clientId}`;
      const path =
        deleteTarget.kind === "weight"
          ? `${base}/weight-logs/${deleteTarget.id}`
          : deleteTarget.kind === "measurement"
            ? `${base}/body-measurements/${deleteTarget.id}`
            : deleteTarget.kind === "photo"
              ? `${base}/photos/${deleteTarget.id}`
              : `${base}/notes/${deleteTarget.id}`;
      await progressRequest(path, { method: "DELETE" }, config);
      await loadTab(activeTab, true);
    } catch (caught) {
      setErrors((current) => ({
        ...current,
        [activeTab]: { kind: "action", message: getProgressErrorMessage(caught) },
      }));
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <div className={cn(isDrawer ? "space-y-4" : "p-4")}>
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold">Progreso</h3>
          <p className="text-sm text-muted-foreground">
            Historial de peso, medidas, fotos y seguimiento.
          </p>
        </div>
        <div
          className={cn(
            "grid rounded-xl border bg-muted/30 p-1 text-sm",
            isDrawer
              ? "grid-flow-col auto-cols-[minmax(4.75rem,1fr)] overflow-x-auto"
              : "grid-cols-2 sm:grid-cols-4 lg:max-w-2xl",
          )}
          role="tablist"
          aria-label="Progreso del cliente"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              aria-controls={`client-progress-${tab.key}-panel`}
              aria-selected={activeTab === tab.key}
              className={cn(
                "rounded-xl px-3 py-1.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                activeTab === tab.key && "bg-background shadow-sm",
              )}
              id={`client-progress-${tab.key}-tab`}
              role="tab"
              tabIndex={activeTab === tab.key ? 0 : -1}
              type="button"
              onClick={() => selectTab(tab.key)}
              onKeyDown={handleTabKeyDown}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isDrawer && !isFormOpen ? (
        <Button className="w-full shadow-none" type="button" onClick={() => openForm(activeTab)}>
          <PlusIcon className="size-4" />
          {tabs.find((tab) => tab.key === activeTab)?.cta ?? tabs[0].cta}
        </Button>
      ) : null}

      {tabs.map((tab) => (
        <div
          key={tab.key}
          aria-labelledby={`client-progress-${tab.key}-tab`}
          className="mt-4"
          hidden={activeTab !== tab.key}
          id={`client-progress-${tab.key}-panel`}
          role="tabpanel"
        >
          <ProgressPanelState
            error={errors[tab.key]}
            isFormOpen={openForms[tab.key]}
            isLoaded={loadedTabs.has(tab.key)}
            isLoading={loadingTabs[tab.key]}
            onRetry={() => void loadTab(tab.key, true)}
          >
            {renderSection(tab.key)}
          </ProgressPanelState>
        </div>
      ))}

      <ConfirmDialog
        confirmLabel="Borrar"
        description="Esta acción elimina el registro del historial de progreso."
        isLoading={saving}
        open={deleteTarget !== null}
        title="Borrar registro"
        onConfirm={deleteSelected}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );

  function renderSection(tab: ProgressTab) {
    if (tab === "weight") {
      return (
        <WeightSection
          items={weightLogs}
          saving={saving}
          variant={variant}
          isFormOpen={openForms.weight}
          onCloseForm={() => closeForm("weight")}
          onDelete={(id) => setDeleteTarget({ kind: "weight", id })}
          shouldRenderHistory={loadedTabs.has("weight")}
          onOpenForm={() => openForm("weight")}
          onSave={async (input, id) => {
            setSaving(true);
            setErrors((current) => ({ ...current, weight: null }));
            try {
              await progressRequest(
                `/progress/clients/${clientId}/weight-logs${id ? `/${id}` : ""}`,
                { method: id ? "PATCH" : "POST", body: JSON.stringify(input) },
                config,
              );
              await loadTab("weight", true);
              return true;
            } catch (caught) {
              setErrors((current) => ({
                ...current,
                weight: { kind: "action", message: getProgressErrorMessage(caught) },
              }));
              return false;
            } finally {
              setSaving(false);
            }
          }}
        />
      );
    }

    if (tab === "measurements") {
      return (
        <MeasurementsSection
          items={measurements}
          saving={saving}
          variant={variant}
          isFormOpen={openForms.measurements}
          onCloseForm={() => closeForm("measurements")}
          onDelete={(id) => setDeleteTarget({ kind: "measurement", id })}
          shouldRenderHistory={loadedTabs.has("measurements")}
          onOpenForm={() => openForm("measurements")}
          onSave={async (input, id) => {
            setSaving(true);
            setErrors((current) => ({ ...current, measurements: null }));
            try {
              await progressRequest(
                `/progress/clients/${clientId}/body-measurements${id ? `/${id}` : ""}`,
                { method: id ? "PATCH" : "POST", body: JSON.stringify(input) },
                config,
              );
              await loadTab("measurements", true);
              return true;
            } catch (caught) {
              setErrors((current) => ({
                ...current,
                measurements: { kind: "action", message: getProgressErrorMessage(caught) },
              }));
              return false;
            } finally {
              setSaving(false);
            }
          }}
        />
      );
    }

    if (tab === "photos") {
      return (
        <PhotosSection
          items={photos}
          saving={saving}
          variant={variant}
          isFormOpen={openForms.photos}
          onCloseForm={() => closeForm("photos")}
          onDelete={(id) => setDeleteTarget({ kind: "photo", id })}
          shouldRenderHistory={loadedTabs.has("photos")}
          onOpenForm={() => openForm("photos")}
          onUpload={async (formData) => {
            setSaving(true);
            setErrors((current) => ({ ...current, photos: null }));
            try {
              await progressFormDataRequest(`/progress/clients/${clientId}/photos`, formData, config);
              await loadTab("photos", true);
              return true;
            } catch (caught) {
              setErrors((current) => ({
                ...current,
                photos: {
                  kind: "action",
                  message: getProgressErrorMessage(caught, "No pudimos subir la foto."),
                },
              }));
              return false;
            } finally {
              setSaving(false);
            }
          }}
        />
      );
    }

    return (
      <NotesSection
        items={notes}
        saving={saving}
        variant={variant}
        isFormOpen={openForms.notes}
        onCloseForm={() => closeForm("notes")}
        onDelete={(id) => setDeleteTarget({ kind: "note", id })}
        shouldRenderHistory={loadedTabs.has("notes")}
        onOpenForm={() => openForm("notes")}
        onSave={async (input, id) => {
          setSaving(true);
          setErrors((current) => ({ ...current, notes: null }));
          try {
            await progressRequest(
              `/progress/clients/${clientId}/notes${id ? `/${id}` : ""}`,
              { method: id ? "PATCH" : "POST", body: JSON.stringify(input) },
              config,
            );
            await loadTab("notes", true);
            return true;
          } catch (caught) {
            setErrors((current) => ({
              ...current,
              notes: { kind: "action", message: getProgressErrorMessage(caught) },
            }));
            return false;
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  return isDrawer ? content : <WorkspacePanel>{content}</WorkspacePanel>;
}

function ProgressPanelState({
  children,
  error,
  isFormOpen,
  isLoaded,
  isLoading,
  onRetry,
}: {
  children: ReactNode;
  error: ProgressError;
  isFormOpen: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  onRetry: () => void;
}) {
  const shouldRenderChildren =
    isLoaded || isFormOpen || Boolean(error && error.kind !== "load");

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <p>{error.message}</p>
          {error.kind === "load" ? (
            <Button
              className="mt-3 shadow-none"
              disabled={isLoading}
              size="sm"
              type="button"
              variant="outline"
              onClick={onRetry}
            >
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : null}
      {isLoading && !isLoaded ? (
        <div className="flex min-h-36 items-center justify-center text-sm text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" />
          Cargando progreso
        </div>
      ) : null}
      {shouldRenderChildren ? children : null}
    </div>
  );
}

function WeightSection({
  isFormOpen,
  items,
  onCloseForm,
  onDelete,
  onOpenForm,
  onSave,
  saving,
  shouldRenderHistory,
  variant,
}: {
  isFormOpen: boolean;
  items: WeightLog[];
  onCloseForm: () => void;
  onDelete: (id: string) => void;
  onOpenForm: () => void;
  onSave: (input: WeightLogInput, id?: string) => Promise<boolean>;
  saving: boolean;
  shouldRenderHistory: boolean;
  variant: ProgressVariant;
}) {
  const [editing, setEditing] = useState<WeightLog | null>(null);
  const form = isFormOpen ? (
    <WeightForm
      key={editing?.id ?? "new"}
      item={editing}
      saving={saving}
      onCancel={() => {
        setEditing(null);
        onCloseForm();
      }}
      onSave={async (input) => {
        const didSave = await onSave(input, editing?.id);
        if (didSave) {
          setEditing(null);
          onCloseForm();
        }
        return didSave;
      }}
    />
  ) : null;
  const list = (
    <RecordList empty="Sin registros de peso.">
      {items.map((item) => (
        <RecordRow
          key={item.id}
          title={`${item.weightKg} kg`}
          meta={formatDate(item.recordedAt) ?? "Sin fecha"}
          note={item.note}
          onDelete={() => onDelete(item.id)}
          onEdit={() => {
            setEditing(item);
            onOpenForm();
          }}
        />
      ))}
    </RecordList>
  );

  if (variant === "page") {
    return (
      <PageProgressSection
        emptyText="Sin registros de peso."
        form={form}
        history={shouldRenderHistory ? list : null}
        isFormOpen={isFormOpen}
        onOpenForm={onOpenForm}
        openLabel="Registrar peso"
        recordCount={items.length}
        tab="weight"
        variant={variant}
      />
    );
  }

  return <div className="space-y-4">{form}{shouldRenderHistory ? list : null}</div>;
}

function WeightForm({
  item,
  onCancel,
  onSave,
  saving,
}: {
  item: WeightLog | null;
  onCancel: () => void;
  onSave: (input: WeightLogInput) => Promise<boolean>;
  saving: boolean;
}) {
  const [weightKg, setWeightKg] = useState(item?.weightKg.toString() ?? "");
  const [recordedAt, setRecordedAt] = useState(toDateInput(item?.recordedAt));
  const [note, setNote] = useState(item?.note ?? "");
  return (
    <form
      className="grid min-w-0 gap-3 rounded-xl border bg-muted/20 p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const didSave = await onSave({
          weightKg: Number(weightKg),
          recordedAt,
          note: note.trim() || null,
        });
        if (didSave) {
          setWeightKg("");
          setNote("");
        }
      }}
    >
      <FormHeader
        description="Registra el peso observado en una fecha concreta."
        title={item ? "Editar peso" : "Registrar peso"}
      />
      <Input label="Peso (kg)" min="1" step="0.1" type="number" value={weightKg} onChange={setWeightKg} />
      <Input label="Fecha" type="date" value={recordedAt} onChange={setRecordedAt} />
      <Input label="Nota" value={note} onChange={setNote} />
      <FormActions
        createLabel="Registrar"
        mode={item ? "edit" : "create"}
        saving={saving}
        onCancel={onCancel}
      />
    </form>
  );
}

function MeasurementsSection({
  isFormOpen,
  items,
  onCloseForm,
  onDelete,
  onOpenForm,
  onSave,
  saving,
  shouldRenderHistory,
  variant,
}: {
  isFormOpen: boolean;
  items: BodyMeasurementLog[];
  onCloseForm: () => void;
  onDelete: (id: string) => void;
  onOpenForm: () => void;
  onSave: (input: BodyMeasurementInput, id?: string) => Promise<boolean>;
  saving: boolean;
  shouldRenderHistory: boolean;
  variant: ProgressVariant;
}) {
  const [editing, setEditing] = useState<BodyMeasurementLog | null>(null);
  const form = isFormOpen ? (
    <MeasurementsForm
      key={editing?.id ?? "new"}
      item={editing}
      saving={saving}
      variant={variant}
      onCancel={() => {
        setEditing(null);
        onCloseForm();
      }}
      onSave={async (input) => {
        const didSave = await onSave(input, editing?.id);
        if (didSave) {
          setEditing(null);
          onCloseForm();
        }
        return didSave;
      }}
    />
  ) : null;
  const list = (
    <RecordList empty="Sin medidas registradas.">
      {items.map((item) => (
        <RecordRow
          key={item.id}
          title={measurementSummary(item)}
          meta={`${formatDate(item.recordedAt) ?? "Sin fecha"} / ${
            item.visibleToClient ? "Visible para cliente" : "Privada"
          }`}
          note={item.note}
          onDelete={() => onDelete(item.id)}
          onEdit={() => {
            setEditing(item);
            onOpenForm();
          }}
        />
      ))}
    </RecordList>
  );

  if (variant === "page") {
    return (
      <PageProgressSection
        emptyText="Sin medidas registradas."
        form={form}
        history={shouldRenderHistory ? list : null}
        isFormOpen={isFormOpen}
        onOpenForm={onOpenForm}
        openLabel="Registrar medidas"
        recordCount={items.length}
        tab="measurements"
        variant={variant}
      />
    );
  }

  return <div className="space-y-4">{form}{shouldRenderHistory ? list : null}</div>;
}

function MeasurementsForm({
  item,
  onCancel,
  onSave,
  saving,
  variant,
}: {
  item: BodyMeasurementLog | null;
  onCancel: () => void;
  onSave: (input: BodyMeasurementInput) => Promise<boolean>;
  saving: boolean;
  variant: ProgressVariant;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(measurementFields.map(([key]) => [key, item?.[key]?.toString() ?? ""])),
  );
  const [recordedAt, setRecordedAt] = useState(toDateInput(item?.recordedAt));
  const [visibleToClient, setVisibleToClient] = useState(item?.visibleToClient ?? false);
  const [note, setNote] = useState(item?.note ?? "");
  return (
    <form
      className="min-w-0 rounded-xl border bg-muted/20 p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const input: BodyMeasurementInput = {
          recordedAt,
          visibleToClient,
          note: note.trim() || null,
        };
        for (const [key] of measurementFields) input[key] = values[key] ? Number(values[key]) : null;
        await onSave(input);
      }}
    >
      <FormHeader
        description="Captura medidas corporales con fecha y visibilidad."
        title={item ? "Editar medidas" : "Registrar medidas"}
      />
      <div className={cn("mt-3 grid min-w-0 gap-3", variant === "page" && "md:grid-cols-2 xl:grid-cols-3")}>
        {measurementFields.map(([key, label]) => (
          <Input
            key={key}
            label={`${label} (cm)`}
            min="0"
            step="0.1"
            type="number"
            value={values[key] ?? ""}
            onChange={(value) => setValues((current) => ({ ...current, [key]: value }))}
          />
        ))}
        <Input label="Fecha" type="date" value={recordedAt} onChange={setRecordedAt} />
        <Input label="Nota" value={note} onChange={setNote} />
        <label className="flex min-w-0 items-end gap-2 pb-2 text-sm">
          <input
            checked={visibleToClient}
            type="checkbox"
            onChange={(event) => setVisibleToClient(event.target.checked)}
          />
          Visible para cliente
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <FormActions
          createLabel="Registrar"
          mode={item ? "edit" : "create"}
          saving={saving}
          onCancel={onCancel}
        />
      </div>
    </form>
  );
}

function PhotosSection({
  isFormOpen,
  items,
  onCloseForm,
  onDelete,
  onOpenForm,
  onUpload,
  saving,
  shouldRenderHistory,
  variant,
}: {
  isFormOpen: boolean;
  items: ProgressPhoto[];
  onCloseForm: () => void;
  onDelete: (id: string) => void;
  onOpenForm: () => void;
  onUpload: (formData: FormData) => Promise<boolean>;
  saving: boolean;
  shouldRenderHistory: boolean;
  variant: ProgressVariant;
}) {
  const form = isFormOpen ? (
    <PhotoForm
      saving={saving}
      onCancel={onCloseForm}
      onUpload={async (formData) => {
        const didUpload = await onUpload(formData);
        if (didUpload) onCloseForm();
        return didUpload;
      }}
    />
  ) : null;
  const list =
    items.length === 0 ? (
      <EmptyText text="Sin fotos de progreso." />
    ) : (
      <div className={cn("grid gap-3", variant === "page" && "md:grid-cols-2 2xl:grid-cols-3")}>
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-xl border bg-background">
            <div className="relative aspect-[4/3] w-full">
              <Image
                alt={`Foto de progreso ${photoTypeLabels[item.photoType]}`}
                className="object-cover"
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                src={item.signedUrl}
                unoptimized
              />
            </div>
            <div className="flex items-center justify-between gap-3 p-3 text-sm">
              <span>{photoTypeLabels[item.photoType]} / {formatDate(item.recordedAt) ?? "Sin fecha"}</span>
              <IconButton label="Borrar foto" onClick={() => onDelete(item.id)}>
                <Trash2Icon className="size-4" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    );

  if (variant === "page") {
    return (
      <PageProgressSection
        emptyText="Sin fotos de progreso."
        form={form}
        history={shouldRenderHistory ? list : null}
        isFormOpen={isFormOpen}
        onOpenForm={onOpenForm}
        openLabel="Subir foto"
        recordCount={items.length}
        tab="photos"
        variant={variant}
      />
    );
  }

  return <div className="space-y-4">{form}{shouldRenderHistory ? list : null}</div>;
}

function PhotoForm({
  onCancel,
  onUpload,
  saving,
}: {
  onCancel: () => void;
  onUpload: (formData: FormData) => Promise<boolean>;
  saving: boolean;
}) {
  const [photoType, setPhotoType] = useState<ProgressPhotoType>("front");
  const [recordedAt, setRecordedAt] = useState(toDateInput());
  const [file, setFile] = useState<File | null>(null);
  const fileInputId = useId();
  return (
    <form
      className="grid min-w-0 gap-3 rounded-xl border bg-muted/20 p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!file) return;
        const formData = new FormData();
        formData.append("photoType", photoType);
        formData.append("recordedAt", recordedAt);
        formData.append("photo", file);
        const didUpload = await onUpload(formData);
        if (didUpload) setFile(null);
      }}
    >
      <FormHeader
        description="Sube una foto visible para comparar avances."
        title="Subir foto"
      />
      <Select
        label="Tipo"
        value={photoType}
        options={photoTypeLabels}
        onChange={(value) => setPhotoType(value as ProgressPhotoType)}
      />
      <Input label="Fecha" type="date" value={recordedAt} onChange={setRecordedAt} />
      <label className="grid min-w-0 gap-1 text-sm font-medium" htmlFor={fileInputId}>
        Foto
      </label>
      <div className="grid min-w-0 gap-2 rounded-xl border bg-background p-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <label
          className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-none transition hover:bg-muted/60 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
          htmlFor={fileInputId}
        >
          Seleccionar archivo
        </label>
        <p className="min-w-0 truncate px-1 text-sm text-muted-foreground">
          {file?.name ?? "Ningún archivo seleccionado"}
        </p>
        <input
          id={fileInputId}
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          required
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>
      <div className="grid gap-2 self-end sm:flex sm:justify-end">
        <Button className="shadow-none" disabled={saving} type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="shadow-none" disabled={saving || !file} type="submit">
          <CameraIcon className="size-4" />
          Subir
        </Button>
      </div>
    </form>
  );
}

function NotesSection({
  isFormOpen,
  items,
  onCloseForm,
  onDelete,
  onOpenForm,
  onSave,
  saving,
  shouldRenderHistory,
  variant,
}: {
  isFormOpen: boolean;
  items: FollowUpNote[];
  onCloseForm: () => void;
  onDelete: (id: string) => void;
  onOpenForm: () => void;
  onSave: (input: FollowUpNoteInput, id?: string) => Promise<boolean>;
  saving: boolean;
  shouldRenderHistory: boolean;
  variant: ProgressVariant;
}) {
  const [editing, setEditing] = useState<FollowUpNote | null>(null);
  const form = isFormOpen ? (
    <NoteForm
      key={editing?.id ?? "new"}
      item={editing}
      saving={saving}
      onCancel={() => {
        setEditing(null);
        onCloseForm();
      }}
      onSave={async (input) => {
        const didSave = await onSave(input, editing?.id);
        if (didSave) {
          setEditing(null);
          onCloseForm();
        }
        return didSave;
      }}
    />
  ) : null;
  const list = (
    <RecordList empty="Sin notas de seguimiento.">
      {items.map((item) => (
        <RecordRow
          key={item.id}
          title={item.visibility === "private" ? "Privada" : "Visible para cliente"}
          meta={formatDate(item.createdAt) ?? "Sin fecha"}
          note={item.text}
          tone={item.visibility === "private" ? "private" : "visible"}
          onDelete={() => onDelete(item.id)}
          onEdit={() => {
            setEditing(item);
            onOpenForm();
          }}
        />
      ))}
    </RecordList>
  );

  if (variant === "page") {
    return (
      <PageProgressSection
        emptyText="Sin notas de seguimiento."
        form={form}
        history={shouldRenderHistory ? list : null}
        isFormOpen={isFormOpen}
        onOpenForm={onOpenForm}
        openLabel="Añadir nota"
        recordCount={items.length}
        tab="notes"
        variant={variant}
      />
    );
  }

  return <div className="space-y-4">{form}{shouldRenderHistory ? list : null}</div>;
}

function NoteForm({
  item,
  onCancel,
  onSave,
  saving,
}: {
  item: FollowUpNote | null;
  onCancel: () => void;
  onSave: (input: FollowUpNoteInput) => Promise<boolean>;
  saving: boolean;
}) {
  const [text, setText] = useState(item?.text ?? "");
  const [visibility, setVisibility] = useState(item?.visibility ?? "private");
  return (
    <form
      className="grid min-w-0 gap-3 rounded-xl border bg-muted/20 p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const didSave = await onSave({ text, visibility });
        if (didSave) setText("");
      }}
    >
      <FormHeader
        description="Deja una observación privada o visible para el cliente."
        title={item ? "Guardar cambios" : "Añadir nota"}
      />
      <textarea
        className="min-h-24 w-full min-w-0 rounded-xl border bg-background px-3 py-2 text-sm"
        placeholder="Nota de seguimiento"
        required
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex flex-col gap-3">
        <Select
          label="Visibilidad"
          value={visibility}
          options={{ private: "Privada", visible_to_client: "Visible para cliente" }}
          onChange={(value) => setVisibility(value as FollowUpNoteInput["visibility"])}
        />
        <FormActions
          createLabel="Añadir"
          mode={item ? "edit" : "create"}
          saving={saving}
          onCancel={onCancel}
        />
      </div>
    </form>
  );
}

function PageProgressSection({
  emptyText,
  form,
  history,
  isFormOpen,
  onOpenForm,
  openLabel,
  recordCount,
  tab,
  variant,
}: {
  emptyText: string;
  form: ReactNode;
  history: ReactNode;
  isFormOpen: boolean;
  onOpenForm: () => void;
  openLabel: string;
  recordCount: number;
  tab: ProgressTab;
  variant: ProgressVariant;
}) {
  const layout = resolveClientProgressLayout({
    isFormOpen,
    recordCount,
    tab,
    variant,
  });

  if (layout.kind === "drawer") {
    return <div className="space-y-4">{form}{history}</div>;
  }

  if (layout.kind === "empty-with-cta") {
    return (
      <EmptyText
        actionLabel={openLabel}
        text={emptyText}
        onAction={onOpenForm}
      />
    );
  }

  if (layout.kind === "full-history") {
    return (
      <div className="space-y-4">
        <Button className="shadow-none" type="button" onClick={onOpenForm}>
          <PlusIcon className="size-4" />
          {openLabel}
        </Button>
        {history}
      </div>
    );
  }

  if (layout.kind === "full-form") {
    return (
      <div
        className={cn(
          "mx-auto w-full min-w-0",
          layout.formWidth === "narrow" ? "max-w-xl" : "max-w-4xl",
        )}
      >
        {form}
      </div>
    );
  }

  if (layout.kind === "measurements-form") {
    return (
      <div className="space-y-4">
        <div className="w-full min-w-0">{form}</div>
        {history}
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] xl:items-start">
      <div className="order-2 min-w-0 xl:order-1">{history}</div>
      <aside className="order-1 min-w-0 xl:order-2 xl:sticky xl:top-4">
        {form}
      </aside>
    </div>
  );
}

function RecordList({ children, empty }: { children: ReactNode; empty: string }) {
  const list = Array.isArray(children) ? children.filter(Boolean) : children;
  return Array.isArray(list) && list.length === 0 ? (
    <EmptyText text={empty} />
  ) : (
    <div className="space-y-2">{children}</div>
  );
}

function FormHeader({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <div className="min-w-0">
      <h4 className="text-sm font-semibold">{title}</h4>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function RecordRow({
  meta,
  note,
  onDelete,
  onEdit,
  title,
  tone,
}: {
  meta: string;
  note?: string | null;
  onDelete: () => void;
  onEdit: () => void;
  title: string;
  tone?: "private" | "visible";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-background p-3 sm:flex-row sm:items-start sm:justify-between",
        tone === "private" && "bg-muted/25",
        tone === "visible" && "border-primary/20 bg-primary/5",
      )}
    >
      <div className="min-w-0">
        <p className="break-words text-sm font-medium">{title}</p>
        <p className="mt-1 break-words text-xs text-muted-foreground">{meta}</p>
        {note ? <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{note}</p> : null}
      </div>
      <div className="flex shrink-0 gap-1 self-end sm:self-start">
        <IconButton label="Editar" onClick={onEdit}>
          <PencilIcon className="size-4" />
        </IconButton>
        <IconButton label="Borrar" onClick={onDelete}>
          <Trash2Icon className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

function FormActions({
  createLabel,
  mode,
  onCancel,
  saving,
}: {
  createLabel: string;
  mode: "create" | "edit";
  onCancel: () => void;
  saving: boolean;
}) {
  const isEditing = mode === "edit";

  return (
    <div className="grid gap-2 self-end sm:flex sm:justify-end">
      <Button className="shadow-none" disabled={saving} type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button className="shadow-none" disabled={saving} type="submit">
        {isEditing ? null : <PlusIcon className="size-4" />}
        {isEditing ? "Guardar cambios" : createLabel}
      </Button>
    </div>
  );
}

function Input({
  label,
  onChange,
  value,
  ...props
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-medium">
      {label}
      <input
        className="w-full min-w-0 rounded-xl border bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}

function Select({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-medium">
      {label}
      <select
        className="w-full min-w-0 rounded-xl border bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {Object.entries(options).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className="size-8 shadow-none"
      size="icon"
      type="button"
      variant="ghost"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function EmptyText({
  actionLabel,
  onAction,
  text,
}: {
  actionLabel?: string;
  onAction?: () => void;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
      <p>{text}</p>
      {actionLabel && onAction ? (
        <Button className="mt-3 shadow-none" type="button" onClick={onAction}>
          <PlusIcon className="size-4" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function measurementSummary(item: BodyMeasurementLog) {
  const parts = measurementFields
    .map(([key, label]) => (item[key] ? `${label} ${item[key]} cm` : null))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "Medidas sin valores";
}
