import type { CompletionCard } from "@/lib/client-portal/api";

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
  const presentation = {
    variant: isCompleted ? "completed" : "partial",
    title: isCompleted ? "Sesión completada" : "Sesión registrada",
    statusLabel: isCompleted ? "Completada" : "Parcial",
    supportingText: isCompleted
      ? "Tu progreso quedó registrado."
      : "Tu progreso quedó registrado parcialmente.",
    shareTitle: isCompleted
      ? "Sesión completada"
      : "Sesión registrada parcialmente",
    completedLabel,
    streakLabel,
    progressLabel: "Avance registrado",
    dateLabel: "Fecha de la sesión",
    formattedDate,
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
  const sessionName = escapeSvgText(truncateText(presentation.sessionName, 42));
  const title = escapeSvgText(presentation.title);
  const statusLabel = escapeSvgText(presentation.statusLabel);
  const supportingText = escapeSvgText(presentation.supportingText);
  const completedLabel = escapeSvgText(presentation.completedLabel);
  const streakLabel = escapeSvgText(presentation.streakLabel);
  const progressLabel = escapeSvgText(presentation.progressLabel);
  const dateLabel = escapeSvgText(presentation.dateLabel);
  const formattedDate = escapeSvgText(presentation.formattedDate);
  const percentage = escapeSvgText(`${presentation.completionPercentage}%`);
  const exercises = escapeSvgText(
    `${presentation.completedExercises}/${presentation.totalExercises}`,
  );
  const streak = escapeSvgText(String(presentation.streak));
  const ariaLabel = escapeSvgText(
    presentation.variant === "completed"
      ? "Resumen de sesión completada"
      : "Resumen de sesión registrada parcialmente",
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1360" viewBox="0 0 1080 1360" role="img" aria-label="${ariaLabel}">
  <rect x="32" y="32" width="1016" height="1296" rx="48" fill="${colors.card}" stroke="${colors.cardStroke}" stroke-width="2"/>
  <circle cx="132" cy="140" r="52" fill="${colors.statusSoft}"/>
  ${presentation.variant === "completed"
    ? `<path d="M106 140 L124 158 L160 118" fill="none" stroke="${colors.status}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="M106 140 H158 M132 114 V166" fill="none" stroke="${colors.status}" stroke-width="10" stroke-linecap="round"/>`}
  <text x="216" y="132" fill="${colors.text}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="58" font-weight="750">${title}</text>
  <rect x="216" y="164" width="182" height="48" rx="24" fill="${colors.statusSoft}"/>
  <text x="307" y="197" fill="${colors.status}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="26" font-weight="750" text-anchor="middle">${statusLabel}</text>
  <text x="72" y="292" fill="${colors.accent}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="40" font-weight="750">${sessionName}</text>
  <text x="72" y="348" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="28" font-weight="500">${supportingText}</text>
  <rect x="72" y="430" width="936" height="520" rx="32" fill="${colors.surface}" stroke="${colors.surfaceStroke}" stroke-width="2"/>
  <line x1="540" y1="430" x2="540" y2="950" stroke="${colors.surfaceStroke}" stroke-width="2"/>
  <line x1="72" y1="690" x2="1008" y2="690" stroke="${colors.surfaceStroke}" stroke-width="2"/>
  ${svgMetric({
    colors,
    detail: completedLabel,
    icon: "dumbbell",
    label: "Ejercicios",
    value: exercises,
    x: 120,
    y: 520,
  })}
  ${svgMetric({
    colors,
    detail: progressLabel,
    icon: "trend",
    label: "Avance",
    value: percentage,
    x: 588,
    y: 520,
  })}
  ${svgMetric({
    colors,
    detail: streakLabel,
    icon: "flame",
    label: "Racha",
    value: streak,
    x: 120,
    y: 780,
  })}
  ${svgMetric({
    colors,
    detail: dateLabel,
    icon: "calendar",
    label: "Fecha",
    value: formattedDate,
    valueSize: 30,
    x: 588,
    y: 780,
  })}
  <line x1="72" y1="1130" x2="1008" y2="1130" stroke="${colors.surfaceStroke}" stroke-width="2"/>
  <text x="72" y="1215" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="30" font-weight="650">CoraFit</text>
  <text x="1008" y="1215" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="26" font-weight="500" text-anchor="end">${statusLabel}</text>
</svg>`;
}

function resolvePresentation(input: CompletionPresentationInput) {
  return "shareText" in input ? input : buildCompletionPresentation(input);
}

type SvgColors = ReturnType<typeof getSvgColors>;

function svgMetric({
  colors,
  detail,
  icon,
  label,
  value,
  valueSize = 54,
  x,
  y,
}: {
  colors: SvgColors;
  detail: string;
  icon: "calendar" | "dumbbell" | "flame" | "trend";
  label: string;
  value: string;
  valueSize?: number;
  x: number;
  y: number;
}) {
  return `<circle cx="${x + 34}" cy="${y + 4}" r="30" fill="${colors.accentSoft}"/>
  ${svgIcon(icon, x + 34, y + 4, colors.accent)}
  <text x="${x + 84}" y="${y - 4}" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="26" font-weight="650">${label}</text>
  <text x="${x + 84}" y="${y + 62}" fill="${colors.text}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${valueSize}" font-weight="800">${value}</text>
  <text x="${x + 84}" y="${y + 108}" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="21" font-weight="500">${detail}</text>`;
}

function svgIcon(icon: "calendar" | "dumbbell" | "flame" | "trend", x: number, y: number, color: string) {
  if (icon === "calendar") {
    return `<rect x="${x - 16}" y="${y - 15}" width="32" height="32" rx="5" fill="none" stroke="${color}" stroke-width="5"/><path d="M${x - 16} ${y - 4} H${x + 16} M${x - 8} ${y - 22} V${y - 10} M${x + 8} ${y - 22} V${y - 10}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`;
  }
  if (icon === "dumbbell") {
    return `<path d="M${x - 17} ${y} H${x + 17} M${x - 11} ${y - 11} V${y + 11} M${x + 11} ${y - 11} V${y + 11} M${x - 20} ${y - 7} V${y + 7} M${x + 20} ${y - 7} V${y + 7}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`;
  }
  if (icon === "flame") {
    return `<path d="M${x} ${y + 16} C${x - 16} ${y + 12} ${x - 18} ${y - 1} ${x - 6} ${y - 10} C${x - 7} ${y + 1} ${x + 5} ${y + 1} ${x + 4} ${y - 17} C${x + 20} ${y - 5} ${x + 20} ${y + 10} ${x} ${y + 16} Z" fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round"/>`;
  }
  return `<path d="M${x - 17} ${y + 12} L${x - 5} ${y} L${x + 4} ${y + 8} L${x + 18} ${y - 10} M${x + 8} ${y - 10} H${x + 18} V${y}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
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
  const status =
    variant === "completed"
      ? dark
        ? "#86efac"
        : "#16803c"
      : dark
        ? "#f3c566"
        : "#9a6a12";

  return {
    ...base,
    status,
    statusSoft:
      variant === "completed"
        ? dark
          ? "#153221"
          : "#eaf8ee"
        : dark
          ? "#3b2e12"
          : "#fff4d6",
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

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
