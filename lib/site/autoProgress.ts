import { type SiteStatus } from "@/lib/types/siteBuilder";

const map: Record<SiteStatus, number> = {
  draft: 0,
  blueprint_pending: 5,
  blueprint_ready: 20,
  assets_generating: 50,
  assets_ready: 80,
  reviewing: 90,
  review_done: 95,
  completed: 100,
  failed: 0,
};

export function autoProgress(step: SiteStatus | string | null | undefined) {
  if (!step) return 0;
  return map[step as SiteStatus] ?? 0;
}
