import { describe, expect, it } from "vitest";
import type { ClientPortalWeightLog } from "@/lib/client-portal/api";
import {
  buildWeightSummary,
  canClientManageWeightLog,
  deleteWeightLogById,
  formatWeightRecordedDate,
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

  it("places a newly created record first when recordedAt ties", () => {
    const recordedAt = "2024-05-18T08:30:00.000Z";
    const result = upsertWeightLog(
      [
        weightLog({ id: "existing-1", recordedAt }),
        weightLog({ id: "existing-2", recordedAt }),
      ],
      weightLog({ id: "new", recordedAt, weightKg: 73.1 }),
    );

    expect(result.map((item) => item.id)).toEqual([
      "new",
      "existing-1",
      "existing-2",
    ]);
  });

  it("summarizes the newly created weight when recordedAt ties", () => {
    const recordedAt = "2024-05-18T08:30:00.000Z";
    const result = upsertWeightLog(
      [weightLog({ id: "existing", recordedAt, weightKg: 72.4 })],
      weightLog({ id: "new", recordedAt, weightKg: 73.1 }),
    );

    expect(buildWeightSummary(result).latestWeightKg).toBe(73.1);
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

  it("preserves previous order when editing with the same recordedAt", () => {
    const recordedAt = "2024-05-18T08:30:00.000Z";
    const result = upsertWeightLog(
      [
        weightLog({ id: "first", recordedAt }),
        weightLog({ id: "second", recordedAt, weightKg: 71.8 }),
      ],
      weightLog({ id: "second", recordedAt, weightKg: 72.2 }),
    );

    expect(result.map((item) => item.id)).toEqual(["first", "second"]);
    expect(result.find((item) => item.id === "second")?.weightKg).toBe(72.2);
  });

  it("does not duplicate records when editing with the same recordedAt", () => {
    const recordedAt = "2024-05-18T08:30:00.000Z";
    const result = upsertWeightLog(
      [
        weightLog({ id: "first", recordedAt }),
        weightLog({ id: "second", recordedAt }),
      ],
      weightLog({ id: "second", recordedAt, weightKg: 72.2 }),
    );

    expect(result).toHaveLength(2);
    expect(result.filter((item) => item.id === "second")).toHaveLength(1);
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

  it("formats midnight UTC as the captured weight date", () => {
    expect(formatWeightRecordedDate("2024-05-18T00:00:00.000Z")).toBe(
      "18 may 2024",
    );
  });
});
