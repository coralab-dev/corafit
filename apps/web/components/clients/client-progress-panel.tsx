"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
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
type DeleteTarget =
  | { kind: "weight"; id: string }
  | { kind: "measurement"; id: string }
  | { kind: "photo"; id: string }
  | { kind: "note"; id: string };

const tabs: Array<{ key: ProgressTab; label: string; cta: string }> = [
  { key: "weight", label: "Peso", cta: "Registrar peso" },
  { key: "measurements", label: "Medidas", cta: "Registrar medidas" },
  { key: "photos", label: "Fotos", cta: "Subir foto" },
  { key: "notes", label: "Notas", cta: "Anadir nota" },
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
  ["gluteCm", "Gluteo"],
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
  const [loading, setLoading] = useState<ProgressTab | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [openForms, setOpenForms] = useState<Record<ProgressTab, boolean>>({
    measurements: !isDrawer,
    notes: !isDrawer,
    photos: !isDrawer,
    weight: !isDrawer,
  });

  const activeTabConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const isFormOpen = openForms[activeTab];

  const loadTab = useCallback(
    async (tab: ProgressTab, force = false) => {
      if (!force && loadedTabs.has(tab)) return;
      setLoading(tab);
      setError(null);
      try {
        if (tab === "weight") {
          setWeightLogs(
            await progressRequest(
              `/progress/clients/${clientId}/weight-logs`,
              { method: "GET" },
              config,
            ),
          );
        } else if (tab === "measurements") {
          setMeasurements(
            await progressRequest(
              `/progress/clients/${clientId}/body-measurements`,
              { method: "GET" },
              config,
            ),
          );
        } else if (tab === "photos") {
          setPhotos(
            await progressRequest(
              `/progress/clients/${clientId}/photos`,
              { method: "GET" },
              config,
            ),
          );
        } else {
          setNotes(
            await progressRequest(
              `/progress/clients/${clientId}/notes`,
              { method: "GET" },
              config,
            ),
          );
        }
        setLoadedTabs((current) => new Set(current).add(tab));
      } catch (caught) {
        setError(getProgressErrorMessage(caught));
      } finally {
        setLoading(null);
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

  async function deleteSelected() {
    if (!deleteTarget) return;
    setSaving(true);
    setError(null);
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
      setError(getProgressErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <div className={cn(isDrawer ? "space-y-4" : "p-4")}>
      <div
        className={cn(
          "flex flex-col gap-3",
          !isDrawer && "md:flex-row md:items-center md:justify-between",
        )}
      >
        <div>
          <h3 className="text-sm font-semibold">Progreso</h3>
          <p className="text-sm text-muted-foreground">
            Historial de peso, medidas, fotos y seguimiento.
          </p>
        </div>
        <div className="grid grid-flow-col auto-cols-[minmax(4.75rem,1fr)] overflow-x-auto rounded-md border bg-muted/30 p-1 text-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={cn(
                "rounded px-3 py-1.5 transition",
                activeTab === tab.key && "bg-background shadow-sm",
              )}
              type="button"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isDrawer && !isFormOpen ? (
        <Button className="w-full shadow-none" type="button" onClick={() => openForm(activeTab)}>
          <PlusIcon className="size-4" />
          {activeTabConfig.cta}
        </Button>
      ) : null}

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {loading === activeTab ? (
        <div className="flex min-h-36 items-center justify-center text-sm text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" />
          Cargando progreso
        </div>
      ) : null}
      {loading !== activeTab ? renderActiveSection() : null}

      <ConfirmDialog
        confirmLabel="Borrar"
        description="Esta accion elimina el registro del historial de progreso."
        isLoading={saving}
        open={deleteTarget !== null}
        title="Borrar registro"
        onConfirm={deleteSelected}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );

  function renderActiveSection() {
    if (activeTab === "weight") {
      return (
        <WeightSection
          items={weightLogs}
          saving={saving}
          variant={variant}
          isFormOpen={isFormOpen}
          onCloseForm={() => closeForm("weight")}
          onDelete={(id) => setDeleteTarget({ kind: "weight", id })}
          onOpenForm={() => openForm("weight")}
          onSave={async (input, id) => {
            setSaving(true);
            setError(null);
            try {
              await progressRequest(
                `/progress/clients/${clientId}/weight-logs${id ? `/${id}` : ""}`,
                { method: id ? "PATCH" : "POST", body: JSON.stringify(input) },
                config,
              );
              await loadTab("weight", true);
            } catch (caught) {
              setError(getProgressErrorMessage(caught));
            } finally {
              setSaving(false);
            }
          }}
        />
      );
    }

    if (activeTab === "measurements") {
      return (
        <MeasurementsSection
          items={measurements}
          saving={saving}
          variant={variant}
          isFormOpen={isFormOpen}
          onCloseForm={() => closeForm("measurements")}
          onDelete={(id) => setDeleteTarget({ kind: "measurement", id })}
          onOpenForm={() => openForm("measurements")}
          onSave={async (input, id) => {
            setSaving(true);
            setError(null);
            try {
              await progressRequest(
                `/progress/clients/${clientId}/body-measurements${id ? `/${id}` : ""}`,
                { method: id ? "PATCH" : "POST", body: JSON.stringify(input) },
                config,
              );
              await loadTab("measurements", true);
            } catch (caught) {
              setError(getProgressErrorMessage(caught));
            } finally {
              setSaving(false);
            }
          }}
        />
      );
    }

    if (activeTab === "photos") {
      return (
        <PhotosSection
          items={photos}
          saving={saving}
          variant={variant}
          isFormOpen={isFormOpen}
          onCloseForm={() => closeForm("photos")}
          onDelete={(id) => setDeleteTarget({ kind: "photo", id })}
          onOpenForm={() => openForm("photos")}
          onUpload={async (formData) => {
            setSaving(true);
            setError(null);
            try {
              await progressFormDataRequest(`/progress/clients/${clientId}/photos`, formData, config);
              await loadTab("photos", true);
            } catch (caught) {
              setError(getProgressErrorMessage(caught, "No pudimos subir la foto."));
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
        isFormOpen={isFormOpen}
        onCloseForm={() => closeForm("notes")}
        onDelete={(id) => setDeleteTarget({ kind: "note", id })}
        onOpenForm={() => openForm("notes")}
        onSave={async (input, id) => {
          setSaving(true);
          setError(null);
          try {
            await progressRequest(
              `/progress/clients/${clientId}/notes${id ? `/${id}` : ""}`,
              { method: id ? "PATCH" : "POST", body: JSON.stringify(input) },
              config,
            );
            await loadTab("notes", true);
          } catch (caught) {
            setError(getProgressErrorMessage(caught));
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  return isDrawer ? content : <WorkspacePanel>{content}</WorkspacePanel>;
}

function WeightSection({
  isFormOpen,
  items,
  onCloseForm,
  onDelete,
  onOpenForm,
  onSave,
  saving,
  variant,
}: {
  isFormOpen: boolean;
  items: WeightLog[];
  onCloseForm: () => void;
  onDelete: (id: string) => void;
  onOpenForm: () => void;
  onSave: (input: WeightLogInput, id?: string) => Promise<void>;
  saving: boolean;
  variant: ProgressVariant;
}) {
  const [editing, setEditing] = useState<WeightLog | null>(null);
  const form = isFormOpen ? (
    <WeightForm
      key={editing?.id ?? "new"}
      item={editing}
      saving={saving}
      variant={variant}
      onCancel={() => {
        setEditing(null);
        onCloseForm();
      }}
      onSave={async (input) => {
        await onSave(input, editing?.id);
        setEditing(null);
        if (variant === "drawer") onCloseForm();
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

  return <div className="space-y-4">{variant === "drawer" ? <>{list}{form}</> : <>{form}{list}</>}</div>;
}

function WeightForm({
  item,
  onCancel,
  onSave,
  saving,
  variant,
}: {
  item: WeightLog | null;
  onCancel: () => void;
  onSave: (input: WeightLogInput) => Promise<void>;
  saving: boolean;
  variant: ProgressVariant;
}) {
  const [weightKg, setWeightKg] = useState(item?.weightKg.toString() ?? "");
  const [recordedAt, setRecordedAt] = useState(toDateInput(item?.recordedAt));
  const [note, setNote] = useState(item?.note ?? "");
  return (
    <form
      className={cn(
        "grid gap-3 rounded-md border bg-muted/20 p-3",
        variant === "page" && "md:grid-cols-[1fr_1fr_2fr_auto]",
      )}
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave({ weightKg: Number(weightKg), recordedAt, note: note.trim() || null });
        setWeightKg("");
        setNote("");
      }}
    >
      <Input label="Kg" min="1" step="0.1" type="number" value={weightKg} onChange={setWeightKg} />
      <Input label="Fecha" type="date" value={recordedAt} onChange={setRecordedAt} />
      <Input label="Nota" value={note} onChange={setNote} />
      <FormActions editing={Boolean(item)} saving={saving} onCancel={onCancel} />
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
  variant,
}: {
  isFormOpen: boolean;
  items: BodyMeasurementLog[];
  onCloseForm: () => void;
  onDelete: (id: string) => void;
  onOpenForm: () => void;
  onSave: (input: BodyMeasurementInput, id?: string) => Promise<void>;
  saving: boolean;
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
        await onSave(input, editing?.id);
        setEditing(null);
        if (variant === "drawer") onCloseForm();
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

  return <div className="space-y-4">{variant === "drawer" ? <>{list}{form}</> : <>{form}{list}</>}</div>;
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
  onSave: (input: BodyMeasurementInput) => Promise<void>;
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
      className="rounded-md border bg-muted/20 p-3"
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
      <div className={cn("grid gap-3", variant === "page" && "md:grid-cols-3")}>
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
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            checked={visibleToClient}
            type="checkbox"
            onChange={(event) => setVisibleToClient(event.target.checked)}
          />
          Visible para cliente
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <FormActions editing={Boolean(item)} saving={saving} onCancel={onCancel} />
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
  variant,
}: {
  isFormOpen: boolean;
  items: ProgressPhoto[];
  onCloseForm: () => void;
  onDelete: (id: string) => void;
  onOpenForm: () => void;
  onUpload: (formData: FormData) => Promise<void>;
  saving: boolean;
  variant: ProgressVariant;
}) {
  const form = isFormOpen ? (
    <PhotoForm
      saving={saving}
      variant={variant}
      onCancel={onCloseForm}
      onUpload={async (formData) => {
        await onUpload(formData);
        if (variant === "drawer") onCloseForm();
      }}
    />
  ) : null;
  const list =
    items.length === 0 ? (
      <EmptyText text="Sin fotos de progreso." />
    ) : (
      <div className={cn("grid gap-3", variant === "page" && "md:grid-cols-2")}>
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-md border bg-background">
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

  return (
    <div className="space-y-4">
      {variant === "drawer" ? <>{list}{form}</> : <>{form}{list}</>}
      {variant === "page" && !isFormOpen ? (
        <Button className="shadow-none" type="button" onClick={onOpenForm}>
          <CameraIcon className="size-4" />
          Subir foto
        </Button>
      ) : null}
    </div>
  );
}

function PhotoForm({
  onCancel,
  onUpload,
  saving,
  variant,
}: {
  onCancel: () => void;
  onUpload: (formData: FormData) => Promise<void>;
  saving: boolean;
  variant: ProgressVariant;
}) {
  const [photoType, setPhotoType] = useState<ProgressPhotoType>("front");
  const [recordedAt, setRecordedAt] = useState(toDateInput());
  const [file, setFile] = useState<File | null>(null);
  return (
    <form
      className={cn(
        "grid gap-3 rounded-md border bg-muted/20 p-3",
        variant === "page" && "md:grid-cols-[1fr_1fr_2fr_auto]",
      )}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!file) return;
        const formData = new FormData();
        formData.append("photoType", photoType);
        formData.append("recordedAt", recordedAt);
        formData.append("photo", file);
        await onUpload(formData);
        setFile(null);
      }}
    >
      <Select
        label="Tipo"
        value={photoType}
        options={photoTypeLabels}
        onChange={(value) => setPhotoType(value as ProgressPhotoType)}
      />
      <Input label="Fecha" type="date" value={recordedAt} onChange={setRecordedAt} />
      <label className="grid gap-1 text-sm font-medium">
        Foto
        <input
          accept="image/jpeg,image/png,image/webp"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          required
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <div className="flex gap-2 self-end">
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
  variant,
}: {
  isFormOpen: boolean;
  items: FollowUpNote[];
  onCloseForm: () => void;
  onDelete: (id: string) => void;
  onOpenForm: () => void;
  onSave: (input: FollowUpNoteInput, id?: string) => Promise<void>;
  saving: boolean;
  variant: ProgressVariant;
}) {
  const [editing, setEditing] = useState<FollowUpNote | null>(null);
  const form = isFormOpen ? (
    <NoteForm
      key={editing?.id ?? "new"}
      item={editing}
      saving={saving}
      variant={variant}
      onCancel={() => {
        setEditing(null);
        onCloseForm();
      }}
      onSave={async (input) => {
        await onSave(input, editing?.id);
        setEditing(null);
        if (variant === "drawer") onCloseForm();
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

  return <div className="space-y-4">{variant === "drawer" ? <>{list}{form}</> : <>{form}{list}</>}</div>;
}

function NoteForm({
  item,
  onCancel,
  onSave,
  saving,
  variant,
}: {
  item: FollowUpNote | null;
  onCancel: () => void;
  onSave: (input: FollowUpNoteInput) => Promise<void>;
  saving: boolean;
  variant: ProgressVariant;
}) {
  const [text, setText] = useState(item?.text ?? "");
  const [visibility, setVisibility] = useState(item?.visibility ?? "private");
  return (
    <form
      className="grid gap-3 rounded-md border bg-muted/20 p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave({ text, visibility });
        setText("");
      }}
    >
      <textarea
        className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="Nota de seguimiento"
        required
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className={cn("flex flex-col gap-3", variant === "page" && "md:flex-row md:items-end md:justify-between")}>
        <Select
          label="Visibilidad"
          value={visibility}
          options={{ private: "Privada", visible_to_client: "Visible para cliente" }}
          onChange={(value) => setVisibility(value as FollowUpNoteInput["visibility"])}
        />
        <FormActions editing={Boolean(item)} saving={saving} onCancel={onCancel} />
      </div>
    </form>
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
        "flex items-start justify-between gap-3 rounded-md border bg-background p-3",
        tone === "private" && "border-amber-200 bg-amber-50/40",
        tone === "visible" && "border-emerald-200 bg-emerald-50/40",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
        {note ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{note}</p> : null}
      </div>
      <div className="flex shrink-0 gap-1">
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
  editing,
  onCancel,
  saving,
}: {
  editing: boolean;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex gap-2 self-end">
      <Button className="shadow-none" disabled={saving} type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button className="shadow-none" disabled={saving} type="submit">
        <PlusIcon className="size-4" />
        {editing ? "Guardar" : "Crear"}
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
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <input
        className="rounded-md border bg-background px-3 py-2 text-sm"
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
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <select
        className="rounded-md border bg-background px-3 py-2 text-sm"
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

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{text}</p>;
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
