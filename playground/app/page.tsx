import { WorkspaceRenderer } from '../components';

const defaultWorkspaceId = "H6vffRmJbCfA-r3kq_36_";

export default async function Home() {
  return (
    <main>
      <WorkspaceRenderer workspaceId={defaultWorkspaceId}  />
    </main>
  )
}

export async function generateMetadata() {
  return { title: 'Blocksuite Workspace Markdown Reader' };
}
