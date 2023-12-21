import { WorkspaceRenderer } from '../components';

const defaultWorkspaceId = "qf73AF6vzWphbTJdN7KiX";

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
