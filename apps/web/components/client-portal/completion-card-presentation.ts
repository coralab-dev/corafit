import type { CompletionCard } from "@/lib/client-portal/api";
import { getCompletionCardBrandDataUri } from "./completion-card-brand";

export type CompletionPresentation = {
  variant: "completed" | "partial";
  title: string;
  statusLabel: string;
  supportingText: string;
  shareTitle: string;
  shareText: string;
  completedLabel: string;
  streakLabel: string;
  progressLabel: string;
  dateLabel: string;
  formattedDate: string;
  formattedDateCompact: string;
  primaryResultLabel: string;
  streakCompactLabel: string;
  sessionName: string;
  completedExercises: number;
  totalExercises: number;
  completionPercentage: number;
  streak: number;
};

type CompletionCardStatus = "completed" | "partially_completed";
type CompletionPresentationInput = CompletionCard | CompletionPresentation;

export function isFinalizedCompletionStatus(
  status: CompletionCard["status"],
): status is CompletionCardStatus {
  return status === "completed" || status === "partially_completed";
}

export function buildCompletionPresentation(
  card: CompletionCard,
): CompletionPresentation {
  if (!isFinalizedCompletionStatus(card.status)) {
    throw new Error("Completion card requires a finalized session");
  }

  const isCompleted = card.status === "completed";
  const completedLabel = pluralize(
    card.completedExercises,
    "ejercicio completado",
    "ejercicios completados",
  );
  const streakLabel = pluralize(card.streak, "día de racha", "días de racha");
  const formattedDate = formatCompletionDate(card.scheduledDate);
  const formattedDateCompact = formatCompletionDateCompact(card.scheduledDate);
  const presentation = {
    variant: isCompleted ? "completed" : "partial",
    title: isCompleted ? "Sesión completada" : "Progreso registrado",
    statusLabel: isCompleted ? "Completada" : "Parcial",
    supportingText: isCompleted
      ? "¡Buen trabajo! Tu progreso quedó registrado."
      : "Cada avance cuenta. Tu sesión quedó guardada.",
    shareTitle: isCompleted
      ? "Sesión completada"
      : "Progreso registrado",
    completedLabel,
    streakLabel,
    progressLabel: isCompleted
      ? "Entrenamiento completado"
      : "Progreso guardado",
    dateLabel: "Fecha de la sesión",
    formattedDate,
    formattedDateCompact,
    primaryResultLabel: `${card.completedExercises} de ${card.totalExercises} ${
      card.totalExercises === 1 ? "ejercicio" : "ejercicios"
    }`,
    streakCompactLabel: pluralize(card.streak, "día", "días"),
    sessionName: card.sessionName,
    completedExercises: card.completedExercises,
    totalExercises: card.totalExercises,
    completionPercentage: card.completionPercentage,
    streak: card.streak,
  } satisfies Omit<CompletionPresentation, "shareText">;

  return {
    ...presentation,
    shareText: [
      "CoraFit",
      presentation.shareTitle,
      presentation.sessionName,
      presentation.completedLabel,
      `${presentation.completionPercentage}% de avance`,
      presentation.streakLabel,
      presentation.formattedDate,
      "#CoraFit",
    ].join("\n"),
  };
}

export function buildShareText(input: CompletionPresentationInput) {
  return resolvePresentation(input).shareText;
}

export function buildCompletionCardSvg(
  input: CompletionPresentationInput,
  dark = false,
) {
  const presentation = resolvePresentation(input);
  const colors = getSvgColors(presentation.variant, dark);
  const brandDataUri = getCompletionCardBrandDataUri(dark);
  const title = escapeSvgText(presentation.title);
  const supportingText = escapeSvgText(presentation.supportingText);
  const primaryResultLabel = escapeSvgText(presentation.primaryResultLabel);
  const progressLabel = escapeSvgText(presentation.progressLabel);
  const formattedDate = escapeSvgText(presentation.formattedDateCompact);
  const streak = escapeSvgText(presentation.streakCompactLabel);
  const percentage = escapeSvgText(`${presentation.completionPercentage}%`);
  const progress = Math.min(
    100,
    Math.max(0, presentation.completionPercentage),
  );
  const progressWidth = Math.round((856 * progress) / 100);
  const ariaLabel = escapeSvgText(
    presentation.variant === "completed"
      ? "Resumen de sesión completada"
      : "Resumen de sesión registrada parcialmente",
  );
  const statusIcon =
    presentation.variant === "completed"
      ? `<path d="M512 220 L531 239 L570 196" fill="none" stroke="${colors.progress}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<circle cx="540" cy="220" r="27" fill="none" stroke="${colors.progress}" stroke-width="9" stroke-dasharray="10 8"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1360" viewBox="0 0 1080 1360" role="img" aria-label="${ariaLabel}">
  <rect width="1080" height="1360" fill="${colors.canvas}"/>
  <rect x="32" y="32" width="1016" height="1296" rx="48" fill="${colors.card}" stroke="${colors.cardStroke}" stroke-width="2"/>
  <image x="72" y="58" width="220" height="48" preserveAspectRatio="xMinYMid meet" href="${brandDataUri}" />
  <text x="1008" y="105" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="3" text-anchor="end">ENTRENAMIENTO</text>
  <circle cx="540" cy="220" r="48" fill="${colors.medalSoft}"/>
  ${statusIcon}
  <text x="540" y="415" fill="${colors.text}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="48" font-weight="800" text-anchor="middle">${title}</text>
  <text x="540" y="478" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="26" font-weight="500" text-anchor="middle">${supportingText}</text>
  <rect x="72" y="530" width="936" height="260" rx="36" fill="${colors.resultSurface}" stroke="${colors.resultStroke}" stroke-width="2"/>
  <text x="112" y="606" fill="${colors.text}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="32" font-weight="700">${primaryResultLabel}</text>
  <text x="968" y="614" fill="${colors.text}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="58" font-weight="800" text-anchor="end">${percentage}</text>
  <rect x="112" y="672" width="856" height="18" rx="9" fill="${colors.track}"/>
  <rect x="112" y="672" width="${progressWidth}" height="18" rx="9" fill="${colors.progress}"/>
  <text x="112" y="740" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="24" font-weight="550">${progressLabel}</text>
  ${svgSecondaryStat({
    colors,
    icon: "flame",
    label: "Racha",
    value: streak,
    x: 72,
    y: 826,
  })}
  ${svgSecondaryStat({
    colors,
    icon: "calendar",
    label: "Fecha",
    value: formattedDate,
    x: 560,
    y: 826,
  })}
  <text x="540" y="1170" fill="${colors.text}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="28" font-weight="650" text-anchor="middle">Entrenando con CoraFit</text>
</svg>`;
}

function resolvePresentation(input: CompletionPresentationInput) {
  return "shareText" in input ? input : buildCompletionPresentation(input);
}

type SvgColors = ReturnType<typeof getSvgColors>;

function svgSecondaryStat({
  colors,
  icon,
  label,
  value,
  x,
  y,
}: {
  colors: SvgColors;
  icon: "calendar" | "flame";
  label: string;
  value: string;
  x: number;
  y: number;
}) {
  const surfaceX = x;
  const textX = x + 104;
  return `<rect x="${surfaceX}" y="${y}" width="448" height="230" rx="28" fill="${colors.surface}" stroke="${colors.surfaceStroke}" stroke-width="2"/>
  <circle cx="${x + 52}" cy="${y + 58}" r="28" fill="${colors.accentSoft}"/>
  ${svgIcon(icon, x + 52, y + 58, colors.accent)}
  <text x="${textX}" y="${y + 66}" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="24" font-weight="650">${label}</text>
  <text x="${textX}" y="${y + 134}" fill="${colors.text}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="34" font-weight="750">${value}</text>`;
}

function svgIcon(icon: "calendar" | "flame", x: number, y: number, color: string) {
  if (icon === "calendar") {
    return `<rect x="${x - 16}" y="${y - 15}" width="32" height="32" rx="5" fill="none" stroke="${color}" stroke-width="5"/><path d="M${x - 16} ${y - 4} H${x + 16} M${x - 8} ${y - 22} V${y - 10} M${x + 8} ${y - 22} V${y - 10}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`;
  }
  return `<path d="M${x} ${y + 16} C${x - 16} ${y + 12} ${x - 18} ${y - 1} ${x - 6} ${y - 10} C${x - 7} ${y + 1} ${x + 5} ${y + 1} ${x + 4} ${y - 17} C${x + 20} ${y - 5} ${x + 20} ${y + 10} ${x} ${y + 16} Z" fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round"/>`;
}

function getSvgColors(variant: CompletionPresentation["variant"], dark: boolean) {
  const base = dark
    ? {
        accent: "#f0c947",
        accentSoft: "#332d17",
        card: "#171b22",
        cardStroke: "#313844",
        muted: "#aeb8c7",
        surface: "#10151b",
        surfaceStroke: "#313844",
        text: "#f4f6f8",
      }
    : {
        accent: "#df4d3e",
        accentSoft: "#fff0eb",
        card: "#ffffff",
        cardStroke: "#e3dfda",
        muted: "#667080",
        surface: "#fbfaf8",
        surfaceStroke: "#e3dfda",
        text: "#17212b",
      };
  return {
    ...base,
    canvas: dark ? "#0f141b" : "#faf9f7",
    resultSurface:
      variant === "completed"
        ? dark
          ? "#211d24"
          : "#fff6f3"
        : dark
          ? "#332914"
          : "#fff8e5",
    resultStroke:
      variant === "completed"
        ? dark
          ? "#40333a"
          : "#f0d8d2"
        : dark
          ? "#59451f"
          : "#ecd99f",
    medalSoft:
      variant === "completed"
        ? dark
          ? "#3a2427"
          : "#fff0eb"
        : dark
          ? "#3b2e12"
          : "#fff4d6",
    track: dark ? "#303743" : "#e8e3de",
    progress: variant === "completed" ? base.accent : dark ? "#f3c566" : "#d9a441",
  };
}

function formatCompletionDate(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid completion date");
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(parsed);
}

function formatCompletionDateCompact(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid completion date");
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  })
    .format(parsed)
    .replaceAll(".", "");
}

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
