"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ApiConfig } from "@/lib/clients/types";

export function ApiConfigDialog({
  config,
  isOpen,
  onClear,
  onOpenChange,
  onSave,
}: {
  config: ApiConfig;
  isOpen: boolean;
  onClear: () => void;
  onOpenChange: (open: boolean) => void;
  onSave: (config: ApiConfig) => void;
}) {
  const [draft, setDraft] = useState(config);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conexion al API</DialogTitle>
          <DialogDescription>
            Usa un JWT real de Supabase y el ID de organizacion para llamar endpoints protegidos.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="api-url">
              API URL
            </label>
            <Input
              id="api-url"
              value={draft.apiUrl}
              onChange={(event) => setDraft({ ...draft, apiUrl: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="organization-id">
              Organization ID
            </label>
            <Input
              id="organization-id"
              value={draft.organizationId}
              onChange={(event) =>
                setDraft({ ...draft, organizationId: event.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="bearer-token">
              Supabase JWT
            </label>
            <Input
              id="bearer-token"
              value={draft.bearerToken}
              onChange={(event) =>
                setDraft({ ...draft, bearerToken: event.target.value })
              }
              placeholder="eyJ..."
              type="password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClear}>
            Limpiar
          </Button>
          <Button type="button" onClick={() => onSave(draft)}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
