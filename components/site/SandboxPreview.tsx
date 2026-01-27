"use client";

import { useEffect, useState } from "react";

interface Props {
  projectId: string;
}

export function SandboxPreview({ projectId }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreview() {
      try {
        const res = await fetch(`/api/site/preview-url?projectId=${projectId}`);
        const data = await res.json();
        if (res.ok && data.previewUrl) {
          setUrl(data.previewUrl as string);
        } else {
          setUrl(null);
        }
      } catch {
        setUrl(null);
      }
    }
    if (projectId) {
      loadPreview();
    }
  }, [projectId]);

  return (
    <div className="relative h-[75vh] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-[0_0_35px_rgba(0,0,0,0.8)]">
      {!url && (
        <div className="flex h-full w-full items-center justify-center text-white/60">
          Carregando preview...
        </div>
      )}
      {url && (
        <iframe
          src={url}
          className="h-full w-full bg-white"
          sandbox="allow-scripts allow-forms allow-same-origin"
        />
      )}
    </div>
  );
}
