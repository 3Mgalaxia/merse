type PaletteColors = {
  primary?: string;
  secondary?: string;
  accent?: string;
};

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const DEFAULT_COLORS: Required<PaletteColors> = {
  primary: "#a855f7",
  secondary: "#14b8a6",
  accent: "#ec4899",
};

const clampColor = (value?: string, fallback?: string) => {
  if (value && HEX_PATTERN.test(value)) return value;
  if (fallback && HEX_PATTERN.test(fallback)) return fallback;
  return "#ffffff";
};

export function injectPaletteStyles(html: string, palette?: PaletteColors) {
  const colors = {
    primary: clampColor(palette?.primary, DEFAULT_COLORS.primary),
    secondary: clampColor(palette?.secondary, DEFAULT_COLORS.secondary),
    accent: clampColor(palette?.accent, DEFAULT_COLORS.accent),
  };

  const style = `
    <style data-merse-palette>
      :root {
        --merse-primary: ${colors.primary};
        --merse-secondary: ${colors.secondary};
        --merse-accent: ${colors.accent};
        --merse-bg: #02010a;
      }
      body {
        background-color: var(--merse-bg);
        color: #f8fafc;
        font-family: "Space Grotesk", "Inter", sans-serif;
      }
      .merse-button {
        background: linear-gradient(135deg, var(--merse-primary), var(--merse-accent));
        color: #0f172a;
        border-radius: 999px;
        padding: 0.85rem 1.8rem;
        font-weight: 600;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }
    </style>
  `;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${style}</head>`);
  }
  return `${style}${html}`;
}

export function injectHeroSection(html: string, imageUrl: string, siteName: string) {
  if (!imageUrl) return html;

  const heroMarkup = `
    <section class="merse-generated-hero">
      <div class="merse-hero-media" role="img" aria-label="Visual gerado automaticamente para ${siteName}">
        <img src="${imageUrl}" alt="Visual conceitual do site ${siteName}" loading="lazy" />
        <div class="merse-hero-gradient"></div>
      </div>
      <div class="merse-hero-caption">
        <p>Visual gerado pela Merse a partir do briefing.</p>
      </div>
    </section>
  `;

  const heroStyles = `
    <style data-merse-hero>
      .merse-generated-hero {
        position: relative;
        border-radius: 32px;
        overflow: hidden;
        margin: 2rem auto;
        max-width: 1200px;
        box-shadow: 0 30px 120px rgba(84, 0, 255, 0.35);
      }
      .merse-hero-media {
        position: relative;
        min-height: 360px;
        background: radial-gradient(circle at top, rgba(168,85,247,0.3), rgba(2,2,8,0.9));
      }
      .merse-hero-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        filter: saturate(1.05);
      }
      .merse-hero-gradient {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(2,2,8,0.15), rgba(2,2,8,0.85));
      }
      .merse-hero-caption {
        position: absolute;
        bottom: 1.5rem;
        left: 2rem;
        right: 2rem;
        color: white;
        font-size: 0.85rem;
        letter-spacing: 0.35em;
        text-transform: uppercase;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      @media (max-width: 768px) {
        .merse-hero-caption {
          flex-direction: column;
          gap: 0.5rem;
          letter-spacing: 0.25em;
        }
      }
    </style>
  `;

  let output = html.includes("</head>") ? html.replace("</head>", `${heroStyles}</head>`) : `${heroStyles}${html}`;
  const bodyOpenMatch = output.match(/<body[^>]*>/i);
  if (bodyOpenMatch && bodyOpenMatch[0]) {
    return output.replace(bodyOpenMatch[0], `${bodyOpenMatch[0]}${heroMarkup}`);
  }
  return `${heroMarkup}${output}`;
}

export function buildImagePrompt({
  siteName,
  goal,
  layout,
  palette,
  heroMood,
  notes,
  rawBrief,
  paletteDescription,
}: {
  siteName: string;
  goal?: string;
  layout?: { label?: string; description?: string };
  palette?: { label?: string; preview?: string };
  heroMood?: string;
  notes?: string;
  rawBrief?: string;
  paletteDescription?: string;
}) {
  const promptLines = [
    `Arte hero cinematográfica para o site "${siteName}".`,
    goal ? `Objetivo do site: ${goal}.` : null,
    layout?.label ? `Layout base: ${layout.label} — ${layout.description ?? "moderno"}.` : null,
    palette?.label ? `Paleta sugerida: ${palette.label}${palette.preview ? ` (${palette.preview})` : ""}.` : null,
    paletteDescription ? `Cores predominantes: ${paletteDescription}.` : null,
    heroMood ? `Mood do hero: ${heroMood}.` : null,
    notes ? `Observações criativas: ${notes}.` : null,
    rawBrief ? `Briefing do usuário: ${rawBrief}.` : null,
    "Use estética Merse futurista, glassmorphism, partículas, luz volumétrica e tipografia premium.",
  ]
    .filter(Boolean)
    .join(" ");

  return promptLines;
}

export function injectAnimationHtml(html: string, animationId?: string, snippet?: string) {
  if (!animationId || !snippet || !snippet.trim()) {
    return html;
  }

  const marker = `<!-- merse-animation:${animationId} -->`;
  if (html.includes(marker)) {
    return html;
  }

  const payload = `\n${marker}\n${snippet.trim()}\n<!-- /merse-animation:${animationId} -->\n`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${payload}</body>`);
  }

  return `${html}${payload}`;
}

export type { PaletteColors };
