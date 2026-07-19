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
      supportingText: "¡Buen trabajo! Tu progreso quedó registrado.",
      title: "Sesión completada",
      variant: "completed",
    });
    expect(presentation.completedLabel).toBe("1 ejercicio completado");
    expect(presentation.streakLabel).toBe("1 día de racha");
    expect(presentation.formattedDateCompact).toBe("20 may 2026");
    expect(presentation.formattedDate).toContain("20");
    expect(presentation.formattedDate).toContain("mayo");
    expect(
      buildCompletionPresentation(
        completionCard({
          completedExercises: 1,
          totalExercises: 1,
        }),
      ).primaryResultLabel,
    ).toBe("1 de 1 ejercicio");
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
      shareTitle: "Progreso registrado",
      statusLabel: "Parcial",
      supportingText: "Cada avance cuenta. Tu sesión quedó guardada.",
      title: "Progreso registrado",
      variant: "partial",
    });
    expect(presentation.completedLabel).toBe("5 ejercicios completados");
    expect(presentation.streakLabel).toBe("12 días de racha");
    expect(buildShareText(card)).not.toContain("Sesión completada");
    expect(buildShareText(card)).toContain("Progreso registrado");
    expect(buildShareText(card)).toContain("#CoraFit");
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
        completedExercises: 5,
        completionPercentage: 67,
        status: "partially_completed",
        totalExercises: 6,
      }),
    );
    const darkSvg = buildCompletionCardSvg(
      completionCard({ sessionName: "kk" }),
      true,
    );

    expect(completedSvg).toContain("Sesión completada");
    expect(completedSvg).toContain("CoraFit");
    expect(completedSvg).toContain("ENTRENAMIENTO");
    expect(completedSvg).toContain("Entrenando con CoraFit");
    expect(completedSvg).not.toContain("Upper &amp; Lower");
    expect(completedSvg).not.toContain(">Completada</text>");
    expect(completedSvg).toContain("6 de 6 ejercicios");
    expect(completedSvg).toContain("20 may 2026");
    expect(completedSvg).toContain("97%");
    expect(completedSvg).toMatch(
      /<rect width="1080" height="1360" fill="[^"]+"\/>/,
    );
    expect(completedSvg).not.toContain('stroke-opacity="0.16"');
    expect(completedSvg).not.toContain('stroke-opacity="0.10"');
    expect(darkSvg).toMatch(
      /<rect width="1080" height="1360" fill="[^"]+"\/>/,
    );
    const lightCanvasFill = completedSvg.match(
      /<rect width="1080" height="1360" fill="([^"]+)"\/>/,
    )?.[1];
    const darkCanvasFill = darkSvg.match(
      /<rect width="1080" height="1360" fill="([^"]+)"\/>/,
    )?.[1];
    expect(lightCanvasFill).toBeDefined();
    expect(darkCanvasFill).toBeDefined();
    expect(lightCanvasFill).not.toBe(darkCanvasFill);
    expect(completedSvg.indexOf('<rect width="1080" height="1360"')).toBeLessThan(
      completedSvg.indexOf('<rect x="32" y="32"'),
    );
    expect(completedSvg).not.toContain("#CoraFit");
    expect(completedSvg).not.toContain('<line x1="540" y1="430"');
    expect(partialSvg).toContain("Progreso registrado");
    expect(partialSvg).toContain("Cada avance cuenta. Tu sesión quedó guardada.");
    expect(partialSvg).toContain("5 de 6 ejercicios");
    expect(partialSvg).not.toContain(">Parcial</text>");
    expect(partialSvg).toContain("67%");
    expect(partialSvg).not.toContain("Sesión completada");
  });
});
