export type SiteStatus =
  | "draft"
  | "blueprint_pending"
  | "blueprint_ready"
  | "assets_generating"
  | "assets_ready"
  | "reviewing"
  | "review_done"
  | "completed"
  | "failed";

export interface SiteReviewScores {
  overall: number;
  visual: number;
  ux: number;
  copy: number;
  images: number;
  conversion: number;
}

export interface SiteImprovement {
  target: string; // ex: "home.hero.copy" ou "home.features[0].title"
  reason: string;
  fixType: "copy" | "layout" | "imagePrompt" | "cta" | "seo";
  newValue: string;
}

export interface SitePageSection {
  id: string;
  type: "hero" | "features" | "gallery" | "pricing" | "contact" | "custom";
  title?: string;
  description?: string;
  copy?: string;
  imagePrompt?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface SitePage {
  id: string;
  slug: string; // ex: "/", "/sobre"
  title: string;
  seoDescription?: string;
  sections: SitePageSection[];
}

export interface SiteProject {
  id: string;
  userId: string;
  name: string;
  brandColors: string[];
  tone: "luxo" | "futurista" | "minimalista" | "corporativo" | "personalizado";
  rawBrief: string;
  createdAt: number;
  updatedAt: number;
  status: SiteStatus;
  currentIteration: number;
  maxIterations: number;
  pages?: SitePage[];
  reviewSummary?: string;
  finalScore?: number;
  progress?: number; // 0 a 100
  currentStep?: string;
  reviewScores?: SiteReviewScores;
  reviewImprovements?: SiteImprovement[];
}

export interface SiteProjectEvent {
  id?: string;
  createdAt: number;
  level: "info" | "warning" | "error";
  message: string;
  step?: string;
}
