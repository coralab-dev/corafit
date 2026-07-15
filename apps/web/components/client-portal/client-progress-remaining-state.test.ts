import { describe, expect, it } from "vitest";
import type {
  ClientPortalBodyMeasurement,
  ClientPortalProgressNote,
  ClientPortalProgressPhoto,
} from "@/lib/client-portal/api";
import {
  applyProgressTabError,
  applyProgressTabSuccess,
  buildMeasurementSummary,
  buildNoteSummary,
  buildPhotoSummary,
  canClientDeleteProgressPhoto,
  deleteProgressPhotoById,
  getVisibleMeasurementFields,
  shouldAutoLoadProgressTab,
  upsertProgressPhoto,
} from "./client-progress-remaining-state";

function measurement(
  overrides: Partial<ClientPortalBodyMeasurement> = {},
): ClientPortalBodyMeasurement {
  return {
    armCm: 30,
    chestCm: 90,
    gluteCm: 98,
    hipCm: 96,
    id: "measurement-1",
    legCm: 56,
    note: null,
    recordedAt: "2024-05-18T00:00:00.000Z",
    waistCm: 78,
    ...overrides,
  };
}

function photo(
  overrides: Partial<ClientPortalProgressPhoto> = {},
): ClientPortalProgressPhoto {
  return {
    id: "photo-1",
    photoType: "front",
    recordedAt: "2024-05-18T00:00:00.000Z",
    signedUrl: "https://example.com/photo.jpg",
    uploadedByType: "client",
    ...overrides,
  };
}

function note(
  overrides: Partial<ClientPortalProgressNote> = {},
): ClientPortalProgressNote {
  return {
    createdAt: "2024-05-18T00:00:00.000Z",
    id: "note-1",
    text: "Texto completo",
    ...overrides,
  };
}

describe("client progress remaining state", () => {
  it("builds a neutral measurement summary for an empty list", () => {
    expect(buildMeasurementSummary([])).toEqual({
      latestRecordedAt: null,
      visibleCount: 0,
    });
  });

  it("uses the first measurement as the latest record", () => {
    expect(
      buildMeasurementSummary([
        measurement({ id: "latest", recordedAt: "2024-05-18T00:00:00.000Z" }),
        measurement({ id: "older", recordedAt: "2024-05-11T00:00:00.000Z" }),
      ]).latestRecordedAt,
    ).toBe("2024-05-18T00:00:00.000Z");
  });

  it("counts visible measurements", () => {
    expect(
      buildMeasurementSummary([
        measurement({ id: "one" }),
        measurement({ id: "two" }),
        measurement({ id: "three" }),
      ]).visibleCount,
    ).toBe(3);
  });

  it("omits null measurement fields", () => {
    expect(
      getVisibleMeasurementFields(
        measurement({ armCm: null, chestCm: null, waistCm: 78 }),
      ).map((field) => field.key),
    ).not.toContain("armCm");
  });

  it("keeps the six measurement fields in display order", () => {
    expect(getVisibleMeasurementFields(measurement()).map((field) => field.key)).toEqual([
      "waistCm",
      "hipCm",
      "chestCm",
      "armCm",
      "legCm",
      "gluteCm",
    ]);
  });

  it("returns no visible values for a measurement with all values null", () => {
    expect(
      getVisibleMeasurementFields(
        measurement({
          armCm: null,
          chestCm: null,
          gluteCm: null,
          hipCm: null,
          legCm: null,
          waistCm: null,
        }),
      ),
    ).toEqual([]);
  });

  it("builds a neutral photo summary for an empty list", () => {
    expect(buildPhotoSummary([])).toEqual({
      latestRecordedAt: null,
      visibleCount: 0,
    });
  });

  it("uses the first photo as latest and counts visible photos", () => {
    expect(
      buildPhotoSummary([
        photo({ id: "latest", recordedAt: "2024-05-18T00:00:00.000Z" }),
        photo({ id: "older", recordedAt: "2024-05-11T00:00:00.000Z" }),
      ]),
    ).toEqual({
      latestRecordedAt: "2024-05-18T00:00:00.000Z",
      visibleCount: 2,
    });
  });

  it("inserts a photo sorted by recordedAt descending", () => {
    const result = upsertProgressPhoto(
      [photo({ id: "older", recordedAt: "2024-05-11T00:00:00.000Z" })],
      photo({ id: "latest", recordedAt: "2024-05-18T00:00:00.000Z" }),
    );

    expect(result.map((item) => item.id)).toEqual(["latest", "older"]);
  });

  it("places a new photo first when recordedAt ties", () => {
    const recordedAt = "2024-05-18T00:00:00.000Z";
    const result = upsertProgressPhoto(
      [photo({ id: "existing", recordedAt })],
      photo({ id: "new", recordedAt }),
    );

    expect(result.map((item) => item.id)).toEqual(["new", "existing"]);
  });

  it("upserts a photo without duplicating ids", () => {
    const result = upsertProgressPhoto(
      [photo({ id: "same", photoType: "front" }), photo({ id: "other" })],
      photo({ id: "same", photoType: "side" }),
    );

    expect(result).toHaveLength(2);
    expect(result.find((item) => item.id === "same")?.photoType).toBe("side");
  });

  it("deletes a photo by id", () => {
    expect(
      deleteProgressPhotoById(
        [photo({ id: "keep" }), photo({ id: "delete-me" })],
        "delete-me",
      ).map((item) => item.id),
    ).toEqual(["keep"]);
  });

  it("allows only client photos to be deleted", () => {
    expect(canClientDeleteProgressPhoto(photo({ uploadedByType: "client" }))).toBe(
      true,
    );
    expect(canClientDeleteProgressPhoto(photo({ uploadedByType: "coach" }))).toBe(
      false,
    );
  });

  it("builds a neutral note summary for an empty list", () => {
    expect(buildNoteSummary([])).toEqual({
      latestCreatedAt: null,
      visibleCount: 0,
    });
  });

  it("uses the first note as latest", () => {
    expect(
      buildNoteSummary([
        note({ id: "latest", createdAt: "2024-05-18T00:00:00.000Z" }),
        note({ id: "older", createdAt: "2024-05-11T00:00:00.000Z" }),
      ]).latestCreatedAt,
    ).toBe("2024-05-18T00:00:00.000Z");
  });

  it("counts visible notes", () => {
    expect(
      buildNoteSummary([note({ id: "one" }), note({ id: "two" })]).visibleCount,
    ).toBe(2);
  });

  it("does not transform or truncate long note text", () => {
    const text = "Linea 1\n" + "palabra".repeat(80);

    expect(note({ text }).text).toBe(text);
  });

  it("keeps known tab data when applying an error", () => {
    expect(
      applyProgressTabError({
        data: [measurement({ id: "known" })],
        error: null,
        loaded: true,
        loading: true,
        requestId: 1,
      }, "No pudimos cargar medidas."),
    ).toMatchObject({
      data: [measurement({ id: "known" })],
      error: "No pudimos cargar medidas.",
      loaded: true,
      loading: false,
    });
  });

  it("updates only the targeted tab state on success", () => {
    const photosState = {
      data: [photo({ id: "known" })],
      error: null,
      loaded: true,
      loading: false,
      requestId: 1,
    };
    const notesState = {
      data: [note({ id: "known-note" })],
      error: "No pudimos cargar notas.",
      loaded: false,
      loading: false,
      requestId: 1,
    };

    expect(applyProgressTabSuccess(photosState, [photo({ id: "next" })])).toMatchObject({
      data: [photo({ id: "next" })],
      error: null,
      loaded: true,
      loading: false,
    });
    expect(notesState).toMatchObject({
      data: [note({ id: "known-note" })],
      error: "No pudimos cargar notas.",
    });
  });

  it("auto-loads an initial tab state", () => {
    expect(
      shouldAutoLoadProgressTab({
        data: [],
        error: null,
        loaded: false,
        loading: false,
        requestId: 0,
      }),
    ).toBe(true);
  });

  it("does not auto-load while loading", () => {
    expect(
      shouldAutoLoadProgressTab({
        data: [],
        error: null,
        loaded: false,
        loading: true,
        requestId: 1,
      }),
    ).toBe(false);
  });

  it("does not auto-load after data is loaded", () => {
    expect(
      shouldAutoLoadProgressTab({
        data: [photo()],
        error: null,
        loaded: true,
        loading: false,
        requestId: 1,
      }),
    ).toBe(false);
  });

  it("does not auto-load after an initial error", () => {
    expect(
      shouldAutoLoadProgressTab({
        data: [],
        error: "No pudimos cargar fotos.",
        loaded: false,
        loading: false,
        requestId: 1,
      }),
    ).toBe(false);
  });
});
