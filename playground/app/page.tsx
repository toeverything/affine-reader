import { WorkspaceRenderer } from "../components";

export default async function Home() {
  return (
    <main>
      <WorkspaceRenderer />
    </main>
  );
}

export async function generateMetadata() {
  return { title: "Blocksuite Workspace Markdown Reader" };
}

export const revalidate = 60;
