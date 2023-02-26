import { WorkspaceRenderer } from "../../../components";

export default async function WorkspacePages({
  params,
}: {
  params: { workspaceId: string, pageId: string };
}) {
  return (
    <main>
      <WorkspaceRenderer workspaceId={params.workspaceId} />
    </main>
  );
}

export const revalidate = 60;