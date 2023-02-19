import { WorkspaceRenderer } from "../workspace-renderer";

export default async function Home({
  params,
}: {
  params: { workspaceId: string };
}) {
  return (
    <main>
      <WorkspaceRenderer workspaceId={params.workspaceId} />
    </main>
  );
}
