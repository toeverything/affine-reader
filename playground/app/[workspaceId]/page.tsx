import { WorkspaceRenderer } from "../workspace-renderer";

export default async function WorkspacePages({
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

export const revalidate = 0;