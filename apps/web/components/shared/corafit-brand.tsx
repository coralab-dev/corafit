import Image from "next/image";

export type CoraFitBrandVariant = "isotipo" | "logotipo" | "imagotipo";
export type CoraFitBrandTone = "color" | "monochrome";
export type CoraFitBrandSurface = "light" | "dark" | "auto";

type CoraFitBrandSource = {
  src: string;
  width: number;
  height: number;
};

type CoraFitBrandSources = {
  light: CoraFitBrandSource;
  dark: CoraFitBrandSource;
};

const brandSources = {
  isotipo: {
    color: {
      light: source("isotipo-color.svg", 768, 578),
      dark: source("isotipo-claro.svg", 768, 578),
    },
    monochrome: {
      light: source("isotipo-negro.svg", 768, 578),
      dark: source("isotipo-claro.svg", 768, 578),
    },
  },
  logotipo: {
    color: {
      light: source("logotipo-negro.svg", 788, 185),
      dark: source("logotipo-claro.svg", 788, 185),
    },
    monochrome: {
      light: source("logotipo-negro.svg", 788, 185),
      dark: source("logotipo-claro.svg", 788, 185),
    },
  },
  imagotipo: {
    color: {
      light: source("imagotipo-texto-negro.svg", 1150, 241),
      dark: source("imagotipo-texto-blanco.svg", 1150, 241),
    },
    monochrome: {
      light: source("imagotipo-negro.svg", 1150, 241),
      dark: source("imagotipo-claro.svg", 1150, 241),
    },
  },
} satisfies Record<
  CoraFitBrandVariant,
  Record<CoraFitBrandTone, CoraFitBrandSources>
>;

export function getCoraFitBrandSources(
  variant: CoraFitBrandVariant,
  tone: CoraFitBrandTone = "color",
): CoraFitBrandSources {
  return brandSources[variant][tone];
}

export interface CoraFitBrandProps {
  alt?: string;
  className?: string;
  priority?: boolean;
  surface?: CoraFitBrandSurface;
  tone?: CoraFitBrandTone;
  variant?: CoraFitBrandVariant;
}

export function CoraFitBrand({
  alt = "CoraFit",
  className,
  priority = false,
  surface = "auto",
  tone = "color",
  variant = "imagotipo",
}: CoraFitBrandProps) {
  const sources = getCoraFitBrandSources(variant, tone);
  const imageClassName = className ?? "";

  if (surface === "light") {
    return <BrandImage alt={alt} asset={sources.light} className={imageClassName} priority={priority} />;
  }

  if (surface === "dark") {
    return <BrandImage alt={alt} asset={sources.dark} className={imageClassName} priority={priority} />;
  }

  // Keep both official variants in the DOM so theme selection is CSS-only and
  // does not depend on a client-side resolvedTheme value during hydration.
  return (
    <span aria-label={alt} className="inline-flex" role="img">
      <BrandImage
        alt=""
        ariaHidden
        asset={sources.light}
        className={`${imageClassName} dark:hidden`.trim()}
        priority={priority}
      />
      <BrandImage
        alt=""
        ariaHidden
        asset={sources.dark}
        className={`${imageClassName} hidden dark:block`.trim()}
        priority={priority}
      />
    </span>
  );
}

function BrandImage({
  alt,
  ariaHidden = false,
  asset,
  className,
  priority,
}: {
  alt: string;
  ariaHidden?: boolean;
  asset: CoraFitBrandSource;
  className?: string;
  priority: boolean;
}) {
  return (
    <Image
      alt={alt}
      aria-hidden={ariaHidden}
      className={className}
      height={asset.height}
      priority={priority}
      src={asset.src}
      unoptimized
      width={asset.width}
    />
  );
}

function source(fileName: string, width: number, height: number): CoraFitBrandSource {
  return {
    height,
    src: `/brand/${fileName}`,
    width,
  };
}
