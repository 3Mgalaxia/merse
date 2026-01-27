import { adminDb } from "@/lib/firebaseAdmin";
import { type SiteProjectEvent } from "@/lib/types/siteBuilder";

export async function addProjectEvent(
  projectId: string,
  message: string,
  level: "info" | "warning" | "error" = "info",
  step?: string,
) {
  const eventsRef = adminDb.collection("site_projects").doc(projectId).collection("events");
  const event: Omit<SiteProjectEvent, "id"> = {
    createdAt: Date.now(),
    level,
    message,
    step,
  };

  await eventsRef.add(event);
}
