export type EffectDefinition = {
  id: string;
  name: string;
  description: string;
  minIntensity: number;
  maxIntensity: number;
  css: (intensity: number) => string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const EFFECT_LIBRARY: EffectDefinition[] = [
  {
    id: "mouse-waves",
    name: "Mouse Waves",
    description: "Ondas líquidas que acompanham o cursor.",
    minIntensity: 1,
    maxIntensity: 10,
    css: (intensity) => {
      const clamped = clamp(intensity, 1, 10);
      const blur = 45 + clamped * 4;
      const duration = 14 - clamped * 0.8;
      return `
        body {
          position: relative;
          overflow: hidden;
        }
        body::before,
        body::after {
          content: "";
          position: fixed;
          inset: -30%;
          pointer-events: none;
          background: radial-gradient(circle at 30% 30%, rgba(168,85,247,0.25), transparent 60%);
          filter: blur(${blur}px);
          animation: merseWave ${duration}s ease-in-out infinite alternate;
        }
        body::after {
          background: radial-gradient(circle at 70% 20%, rgba(14,165,233,0.2), transparent 55%);
          animation-duration: ${duration * 1.2}s;
        }
        @keyframes merseWave {
          0% {
            transform: translate3d(-5%, -3%, 0) rotate(2deg);
          }
          100% {
            transform: translate3d(5%, 3%, 0) rotate(-2deg);
          }
        }
      `;
    },
  },
  {
    id: "aurora-parallax",
    name: "Aurora Parallax",
    description: "Lençóis de luz com parallax suave.",
    minIntensity: 1,
    maxIntensity: 5,
    css: (intensity) => {
      const clamped = clamp(intensity, 1, 5);
      const speed = 20 - clamped * 2;
      return `
        body {
          background: radial-gradient(circle at 20% 20%, rgba(236,72,153,0.15), transparent 55%),
                      radial-gradient(circle at 80% 0%, rgba(14,165,233,0.18), transparent 60%),
                      #02010a;
        }
        .merse-aurora-layer {
          position: fixed;
          inset: 0;
          background: linear-gradient(125deg, rgba(79,70,229,0.35), rgba(236,72,153,0.15), rgba(14,165,233,0.2));
          mix-blend-mode: screen;
          opacity: 0.65;
          filter: blur(120px);
          transform: translate3d(0,0,0);
          animation: merseAuroraMove ${speed}s ease-in-out infinite alternate;
          pointer-events: none;
        }
        @keyframes merseAuroraMove {
          0% { transform: translate3d(-6%, -4%, 0); }
          100% { transform: translate3d(6%, 4%, 0); }
        }
      `;
    },
  },
  {
    id: "particles-trail",
    name: "Particles Trail",
    description: "Partículas cintilantes seguindo o mouse.",
    minIntensity: 1,
    maxIntensity: 8,
    css: (intensity) => {
      const clamped = clamp(intensity, 1, 8);
      const count = 20 + clamped * 5;
      const duration = 16 - clamped;
      const gradientOpacity = 0.15 + clamped * 0.02;
      return `
        body {
          background-image:
            radial-gradient(circle at 20% 20%, rgba(255,255,255,${gradientOpacity}), transparent 55%),
            radial-gradient(circle at 80% 30%, rgba(14,165,233,${gradientOpacity}), transparent 60%),
            #02010a;
        }
        body::after {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: ${Array.from({ length: count })
            .map(
              (_, index) =>
                `radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(255,255,255,0.7), transparent 40%)`,
            )
            .join(",")};
          background-size: 100% 100%;
          animation: merseParticles ${duration}s linear infinite;
          opacity: 0.8;
        }
        @keyframes merseParticles {
          0% { transform: translateY(0); }
          100% { transform: translateY(-4%); }
        }
      `;
    },
  },
  {
    id: "section-reveal",
    name: "Section Reveal",
    description: "Seções com entrada suave em cascata.",
    minIntensity: 1,
    maxIntensity: 6,
    css: (intensity) => {
      const clamped = clamp(intensity, 1, 6);
      const delay = 0.05 * clamped;
      return `
        section, .merse-section {
          opacity: 0;
          transform: translateY(${30 + clamped * 4}px);
          animation: merseSectionReveal 0.8s ease forwards;
        }
        section:nth-of-type(n), .merse-section:nth-of-type(n) {
          animation-delay: calc(${delay}s * var(--merse-section-index, 1));
        }
        @keyframes merseSectionReveal {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
    },
  },
  {
    id: "glass-header",
    name: "Glass Morph Header",
    description: "Cabeçalho translúcido com brilho constante.",
    minIntensity: 1,
    maxIntensity: 4,
    css: (intensity) => {
      const clamped = clamp(intensity, 1, 4);
      const blur = 12 + clamped * 2;
      return `
        header, .merse-header {
          backdrop-filter: blur(${blur}px);
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.08),
            rgba(168,85,247,0.08)
          );
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 20px 50px rgba(2,2,8,0.35);
        }
      `;
    },
  },
];

export function getEffectDefinition(id?: string | null) {
  if (!id) return null;
  return EFFECT_LIBRARY.find((effect) => effect.id === id) ?? null;
}

export function createEffectStyleBlock(effectId?: string, intensity?: number) {
  const effect = getEffectDefinition(effectId);
  if (!effect) return "";
  const css = effect.css(intensity ?? effect.minIntensity);
  if (!css.trim()) {
    return "";
  }
  return `<style data-merse-effect="${effect.id}">${css}</style>`;
}

export function injectEffectStyles(html: string, effectId?: string, intensity?: number) {
  const styleBlock = createEffectStyleBlock(effectId, intensity);
  if (!styleBlock) {
    return html;
  }

  if (html.includes("</head>")) {
    return html.replace("</head>", `${styleBlock}</head>`);
  }

  return `${styleBlock}${html}`;
}
