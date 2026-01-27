import { notFound } from "next/navigation";
import { getProjectBundle } from "@/lib/sandbox/getBundle";

type SearchParams = { projectId?: string };

export default async function PreviewPage({ searchParams }: { searchParams?: SearchParams }) {
  const projectId = searchParams?.projectId;
  if (!projectId) return notFound();

  const bundle = await getProjectBundle(projectId);
  if (!bundle) {
    return (
      <html>
        <body className="bg-black text-white">
          <div className="flex min-h-screen items-center justify-center text-white/70">
            Projeto sem bundle gerado ainda.
          </div>
        </body>
      </html>
    );
  }

  const Component = bundle.Main;

  return (
    <html>
      <body className="bg-black text-white">
        <Component />
      </body>
    </html>
  );
}
