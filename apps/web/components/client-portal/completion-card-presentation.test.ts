import { describe, expect, it } from "vitest";
import type { CompletionCard } from "@/lib/client-portal/api";
import {
  buildCompletionCardSvg,
  buildCompletionPresentation,
  buildShareText,
} from "./completion-card-presentation";

function completionCard(
  overrides: Partial<CompletionCard> = {},
): CompletionCard {
  return {
    completionPercentage: 100,
    completedExercises: 6,
    scheduledDate: "2026-05-20",
    sessionName: "Fuerza total",
    status: "completed",
    streak: 3,
    totalExercises: 6,
    ...overrides,
  };
}

describe("completion card presentation", () => {
  it("produces completed copy and singular/plural labels", () => {
    const presentation = buildCompletionPresentation(
      completionCard({ completedExercises: 1, streak: 1, totalExercises: 6 }),
    );

    expect(presentation).toMatchObject({
      statusLabel: "Completada",
      title: "Sesión completada",
      variant: "completed",
    });
    expect(presentation.completedLabel).toBe("1 ejercicio completado");
    expect(presentation.streakLabel).toBe("1 día de racha");
    expect(presentation.formattedDate).toContain("20");
    expect(presentation.formattedDate).toContain("mayo");
  });

  it("produces partial copy without presenting it as completed", () => {
    const card = completionCard({
      completedExercises: 5,
      completionPercentage: 83,
      status: "partially_completed",
      streak: 12,
    });
    const presentation = buildCompletionPresentation(card);

    expect(presentation).toMatchObject({
      shareTitle: "Sesión registrada parcialmente",
      statusLabel: "Parcial",
      supportingText: "Tu progreso quedó registrado parcialmente.",
      title: "Sesión registrada",
      variant: "partial",
    });
    expect(presentation.completedLabel).toBe("5 ejercicios completados");
    expect(presentation.streakLabel).toBe("12 días de racha");
    expect(buildShareText(card)).not.toContain("Sesión completada");
    expect(buildShareText(card)).toContain("Sesión registrada parcialmente");
  });

  it("keeps long session names in the presentation model", () => {
    const sessionName = "Sesión de fuerza y movilidad con bloque accesorio largo";

    expect(
      buildCompletionPresentation(completionCard({ sessionName })).sessionName,
    ).toBe(sessionName);
  });

  it("rejects statuses that cannot render a completion card", () => {
    expect(() =>
      buildCompletionPresentation(completionCard({ status: "in_progress" })),
    ).toThrow("Completion card requires a finalized session");
    expect(() =>
      buildCompletionPresentation(completionCard({ status: "opened" })),
    ).toThrow("Completion card requires a finalized session");
  });

  it("keeps the SVG copy aligned with completed and partial states", () => {
    const completedSvg = buildCompletionCardSvg(
      completionCard({ sessionName: "Upper & Lower", completionPercentage: 97 }),
    );
    const partialSvg = buildCompletionCardSvg(
      completionCard({
        completionPercentage: 67,
        status: "partially_completed",
      }),
    );

    expect(completedSvg).toContain("Sesión completada");
    expect(completedSvg).toContain("Upper &amp; Lower");
    expect(completedSvg).toContain("97%");
    expect(partialSvg).toContain("Sesión registrada");
    expect(partialSvg).toContain("Parcial");
    expect(partialSvg).toContain("67%");
    expect(partialSvg).not.toContain("Sesión completada");
  });
});
