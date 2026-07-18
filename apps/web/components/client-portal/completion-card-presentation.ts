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
    primaryResultLabel: `${card.completedExercises} de ${card.totalExercises} ejercicios`,
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
  const sessionName = wrapSvgText(presentation.sessionName, 42)
    .map(escapeSvgText)
    .map((line, index) => `<tspan x="540" dy="${index === 0 ? 0 : 44}">${line}</tspan>`)
    .join("");
  const title = escapeSvgText(presentation.title);
  const statusLabel = escapeSvgText(presentation.statusLabel);
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
  <rect x="32" y="32" width="1016" height="1296" rx="48" fill="${colors.card}" stroke="${colors.cardStroke}" stroke-width="2"/>
  <text x="72" y="105" fill="${colors.progress}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="32" font-weight="650">CoraFit</text>
  <text x="1008" y="105" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="3" text-anchor="end">ENTRENAMIENTO</text>
  <circle cx="540" cy="220" r="44" fill="${colors.medalSoft}"/>
  <circle cx="540" cy="220" r="61" fill="none" stroke="${colors.progress}" stroke-opacity="0.14" stroke-width="3"/>
  <circle cx="540" cy="220" r="78" fill="none" stroke="${colors.progress}" stroke-opacity="0.08" stroke-width="3"/>
  ${statusIcon}
  <rect x="450" y="318" width="180" height="44" rx="22" fill="${colors.statusSoft}"/>
  <text x="540" y="348" fill="${colors.status}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="24" font-weight="750" text-anchor="middle">${statusLabel}</text>
  <text x="540" y="415" fill="${colors.text}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="48" font-weight="800" text-anchor="middle">${title}</text>
  <text x="540" y="478" fill="${colors.text}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="36" font-weight="650" text-anchor="middle">${sessionName}</text>
  <text x="540" y="566" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="26" font-weight="500" text-anchor="middle">${supportingText}</text>
  <rect x="72" y="618" width="936" height="260" rx="36" fill="${colors.resultSurface}" stroke="${colors.resultStroke}" stroke-width="2"/>
  <text x="112" y="694" fill="${colors.text}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="32" font-weight="700">${primaryResultLabel}</text>
  <text x="968" y="702" fill="${colors.text}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="58" font-weight="800" text-anchor="end">${percentage}</text>
  <rect x="112" y="760" width="856" height="18" rx="9" fill="${colors.track}"/>
  <rect x="112" y="760" width="${progressWidth}" height="18" rx="9" fill="${colors.progress}"/>
  <text x="112" y="828" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="24" font-weight="550">${progressLabel}</text>
  ${svgSecondaryStat({
    colors,
    icon: "flame",
    label: "Racha",
    value: streak,
    x: 72,
    y: 914,
  })}
  ${svgSecondaryStat({
    colors,
    icon: "calendar",
    label: "Fecha",
    value: formattedDate,
    x: 560,
    y: 914,
  })}
  <text x="540" y="1198" fill="${colors.text}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="28" font-weight="650" text-anchor="middle">Entrenando con CoraFit</text>
  <text x="540" y="1234" fill="${colors.muted}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="22" font-weight="550" letter-spacing="2" text-anchor="middle">#CoraFit</text>
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
    status,
    medalSoft:
      variant === "completed"
        ? dark
          ? "#3a2427"
          : "#fff0eb"
        : dark
          ? "#3b2e12"
          : "#fff4d6",
    statusSoft:
      variant === "completed"
        ? dark
          ? "#153221"
          : "#eaf8ee"
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

function wrapSvgText(value: string, maxLength: number) {
  const words = truncateText(value.trim(), maxLength * 2)
    .split(/\s+/)
    .filter(Boolean);
  const lines: string[] = [];

  for (const word of words) {
    const safeWord = truncateText(word, maxLength);
    const lastLine = lines.at(-1) ?? "";
    const nextLine = lastLine ? `${lastLine} ${safeWord}` : safeWord;

    if (nextLine.length <= maxLength || lines.length === 0) {
      if (lines.length === 0) {
        lines.push(nextLine);
      } else if (nextLine.length <= maxLength) {
        lines[lines.length - 1] = nextLine;
      } else {
        lines.push(safeWord);
      }
      continue;
    }

    if (lines.length === 1) {
      lines.push(safeWord);
      continue;
    }

    lines[1] = truncateText(`${lines[1]} ${word}`, maxLength);
    break;
  }

  return lines.length > 0 ? lines : [""];
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
