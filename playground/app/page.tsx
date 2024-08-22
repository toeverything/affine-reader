import { blogReader } from "@/reader";
import { WorkspaceRenderer } from "../components";

export default async function Home() {
  const pages = await blogReader.getDocPageMetas();
  return (
    <main>
      <WorkspaceRenderer pages={pages} />
    </main>
  );
}

export async function generateMetadata() {
  return { title: "Blocksuite Workspace Markdown Reader" };
}

export const revalidate = 60;
