import { describe, expect, it } from "vitest";
import type { ClientPortalWeightLog } from "@/lib/client-portal/api";
import {
  buildWeightSummary,
  canClientManageWeightLog,
  deleteWeightLogById,
  upsertWeightLog,
} from "./client-progress-weight-state";

function weightLog(
  overrides: Partial<ClientPortalWeightLog> = {},
): ClientPortalWeightLog {
  return {
    id: "weight-1",
    note: null,
    recordedAt: "2024-05-18T08:30:00.000Z",
    recordedByType: "client",
    weightKg: 72.4,
    ...overrides,
  };
}

describe("client progress weight state", () => {
  it("builds a neutral summary for an empty list", () => {
    expect(buildWeightSummary([])).toEqual({
      latestRecordedAt: null,
      latestWeightKg: null,
      visibleCount: 0,
    });
  });

  it("uses the first record as the latest weight", () => {
    expect(
      buildWeightSummary([
        weightLog({ id: "latest", weightKg: 72.4 }),
        weightLog({ id: "older", weightKg: 71.8 }),
      ]).latestWeightKg,
    ).toBe(72.4);
  });

  it("counts visible records", () => {
    expect(
      buildWeightSummary([
        weightLog({ id: "one" }),
        weightLog({ id: "two" }),
        weightLog({ id: "three" }),
      ]).visibleCount,
    ).toBe(3);
  });

  it("inserts a new record and sorts by recordedAt descending", () => {
    const result = upsertWeightLog(
      [
        weightLog({ id: "older", recordedAt: "2024-05-11T08:30:00.000Z" }),
        weightLog({ id: "oldest", recordedAt: "2024-05-04T08:30:00.000Z" }),
      ],
      weightLog({ id: "latest", recordedAt: "2024-05-18T08:30:00.000Z" }),
    );

    expect(result.map((item) => item.id)).toEqual(["latest", "older", "oldest"]);
  });

  it("replaces an edited record by id without duplicating it", () => {
    const result = upsertWeightLog(
      [
        weightLog({ id: "same", weightKg: 71.8 }),
        weightLog({ id: "other", weightKg: 70.9 }),
      ],
      weightLog({ id: "same", weightKg: 72.4 }),
    );

    expect(result).toHaveLength(2);
    expect(result.find((item) => item.id === "same")?.weightKg).toBe(72.4);
  });

  it("reorders an edited record when recordedAt changes", () => {
    const result = upsertWeightLog(
      [
        weightLog({ id: "first", recordedAt: "2024-05-18T08:30:00.000Z" }),
        weightLog({ id: "second", recordedAt: "2024-05-11T08:30:00.000Z" }),
      ],
      weightLog({ id: "second", recordedAt: "2024-05-25T08:30:00.000Z" }),
    );

    expect(result.map((item) => item.id)).toEqual(["second", "first"]);
  });

  it("deletes only the target id", () => {
    const result = deleteWeightLogById(
      [
        weightLog({ id: "keep-1" }),
        weightLog({ id: "delete-me" }),
        weightLog({ id: "keep-2" }),
      ],
      "delete-me",
    );

    expect(result.map((item) => item.id)).toEqual(["keep-1", "keep-2"]);
  });

  it("allows client records to be edited and deleted", () => {
    expect(canClientManageWeightLog(weightLog({ recordedByType: "client" }))).toBe(
      true,
    );
  });

  it("keeps coach records read-only", () => {
    expect(canClientManageWeightLog(weightLog({ recordedByType: "coach" }))).toBe(
      false,
    );
  });
});
