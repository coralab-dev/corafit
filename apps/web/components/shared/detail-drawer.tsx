"use client";

import { XIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

export function DetailDrawer({
  children,
  description,
  onOpenChange,
  open,
  title,
}: {
  children: ReactNode;
  description: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}) {
  const [isClosing, setIsClosing] = useState(false);

  if (!open) {
    return null;
  }

  function close() {
    setIsClosing(true);
    window.setTimeout(() => {
      onOpenChange(false);
      setIsClosing(false);
    }, 220);
  }

  return (
    <DrawerSurface description={description} isClosing={isClosing} title={title} onClose={close}>
      {children}
    </DrawerSurface>
  );
}

function DrawerSurface({
  children,
  description,
  isClosing,
  onClose,
  title,
}: {
  children: ReactNode;
  description: string;
  isClosing: boolean;
  onClose: () => void;
  title: string;
}) {
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHasEntered(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Cerrar detalle"
        className={[
          "absolute inset-0 bg-black/50 transition-opacity duration-150",
          isClosing || !hasEntered ? "opacity-0" : "opacity-100",
        ].join(" ")}
        type="button"
        onClick={onClose}
      />
      <aside
        aria-describedby="detail-drawer-description"
        aria-labelledby="detail-drawer-title"
        aria-modal="true"
        className={[
          "absolute inset-y-0 right-0 flex w-[92vw] flex-col overflow-hidden border-l bg-background shadow-2xl transition-transform duration-300 ease-out md:w-[440px]",
          isClosing || !hasEntered ? "translate-x-full" : "translate-x-0",
        ].join(" ")}
        role="dialog"
      >
        <div className="sr-only">
          <h2 id="detail-drawer-title">{title}</h2>
          <p id="detail-drawer-description">{description}</p>
        </div>
        <button
          aria-label="Cerrar detalle"
          className="absolute right-4 top-5 z-10 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          type="button"
          onClick={onClose}
        >
          <XIcon className="size-5" />
        </button>
        {children}
      </aside>
    </div>
  );
}
