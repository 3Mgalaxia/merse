import { useEffect, useState } from "react";
import { getFirestore, doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { firebaseApp } from "@/lib/firebase";

interface ProjectEvent {
  id: string;
  createdAt: number;
  level: "info" | "warning" | "error";
  message: string;
  step?: string;
}

interface ProjectStatus {
  status: string;
  progress: number;
  currentStep?: string;
  events: ProjectEvent[];
}

export function useSiteProjectStatus(projectId?: string | null): ProjectStatus | null {
  const [data, setData] = useState<ProjectStatus | null>(null);

  useEffect(() => {
    if (!projectId || !firebaseApp) return;

    const db = getFirestore(firebaseApp);
    const projectRef = doc(db, "site_projects", projectId);
    const eventsRef = collection(projectRef, "events");
    const eventsQuery = query(eventsRef, orderBy("createdAt", "asc"));

    const unsubProject = onSnapshot(projectRef, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data() as any;
      setData((prev) => ({
        status: d.status,
        progress: d.progress ?? prev?.progress ?? 0,
        currentStep: d.currentStep,
        events: prev?.events ?? [],
      }));
    });

    const unsubEvents = onSnapshot(eventsQuery, (snap) => {
      const events: ProjectEvent[] = [];
      snap.forEach((docSnap) => events.push({ id: docSnap.id, ...(docSnap.data() as any) }));
      setData((prev) =>
        prev
          ? {
              ...prev,
              events,
            }
          : {
              status: "draft",
              progress: 0,
              currentStep: "Iniciando...",
              events,
            },
      );
    });

    return () => {
      unsubProject();
      unsubEvents();
    };
  }, [projectId]);

  return data;
}
