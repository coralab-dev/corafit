import { describe, expect, test } from "vitest";
import type { ClientAccess } from "@/lib/clients/types";
import {
  buildAccessViewState,
  getPlanSummary,
  markAccessDisabled,
  markAccessGenerated,
  resolveAccessLoadFailure,
} from "./client-access-state";

const baseAccess: ClientAccess = {
  createdAt: "2026-01-10T12:00:00.000Z",
  id: "access-1",
  lastAccessAt: "2026-02-10T12:00:00.000Z",
  lockedUntil: null,
  status: "active",
  updatedAt: "10 feb 2026",
  updatedAtRaw: "2026-02-11T12:00:00.000Z",
};

describe("client access state", () => {
  test("none shows only generate", () => {
    const state = buildAccessViewState({ status: "none" });

    expect(state.primaryAction).toBe("generate");
    expect(state.secondaryActions).toEqual([]);
    expect(state.copy).not.toContain("Proximamente");
  });

  test("disabled shows only generate", () => {
    const state = buildAccessViewState({ status: "disabled" });

    expect(state.primaryAction).toBe("generate");
    expect(state.secondaryActions).toEqual([]);
    expect(state.copy).not.toContain("Proximamente");
  });

  test("active shows regenerate and disable", () => {
    const state = buildAccessViewState({ ...baseAccess, status: "active" });

    expect(state.primaryAction).toBe("regenerate");
    expect(state.secondaryActions).toEqual(["disable"]);
    expect(state.copy).toContain("credenciales completas no se pueden recuperar");
    expect(state.copy).not.toContain("Proximamente");
  });

  test("temporarily locked shows locked until details with regenerate and disable", () => {
    const state = buildAccessViewState({
      ...baseAccess,
      lockedUntil: "2026-02-14T09:00:00.000Z",
      status: "temporarily_locked",
    });

    expect(state.primaryAction).toBe("regenerate");
    expect(state.secondaryActions).toEqual(["disable"]);
    expect(state.lockedUntil).toBe("2026-02-14T09:00:00.000Z");
    expect(state.copy).toContain("bloqueado temporalmente");
    expect(state.copy).not.toContain("Proximamente");
  });

  test("disable preserves the last known access history", () => {
    const disabled = markAccessDisabled(baseAccess, "2026-03-01T12:00:00.000Z");

    expect(disabled).toMatchObject({
      createdAt: baseAccess.createdAt,
      id: baseAccess.id,
      lastAccessAt: baseAccess.lastAccessAt,
      status: "disabled",
      updatedAtRaw: "2026-03-01T12:00:00.000Z",
    });
  });

  test("generate and regenerate show temporary credentials and clear a previous lock", () => {
    const generated = markAccessGenerated(
      {
        ...baseAccess,
        lockedUntil: "2026-02-14T09:00:00.000Z",
        status: "temporarily_locked",
      },
      {
        access: { id: "access-2", status: "active" },
        link: "https://portal.example/private",
        pin: "123456",
      },
      "2026-03-01T12:00:00.000Z",
    );

    expect(generated.access).toMatchObject({
      id: "access-2",
      lockedUntil: null,
      status: "active",
      updatedAtRaw: "2026-03-01T12:00:00.000Z",
    });
    expect(generated.generatedAccess).toEqual({
      link: "https://portal.example/private",
      pin: "123456",
    });
  });

  test("plan errors stay explicit without blocking access management", () => {
    expect(getPlanSummary(null, "No se pudo cargar el plan")).toEqual({
      label: "Plan no disponible",
      tone: "warning",
    });
  });

  test("initial load failures clear the screen into an error state", () => {
    expect(resolveAccessLoadFailure({
      assignment: { id: "plan-1" },
      client: { id: "client-1" },
      hasLoaded: false,
    })).toEqual({
      assignment: null,
      client: null,
    });
  });

  test("refresh failures preserve the last known client and plan", () => {
    const previousClient = { id: "client-1" };
    const previousAssignment = { id: "plan-1" };

    expect(resolveAccessLoadFailure({
      assignment: previousAssignment,
      client: previousClient,
      hasLoaded: true,
    })).toEqual({
      assignment: previousAssignment,
      client: previousClient,
    });
  });
});
