import { reader } from "@/reader";
import { WorkspaceRenderer } from "../components";
import Link from "next/link";

export default async function Home() {
  const pages = await reader.getDocPageMetas();
  return (
    <main>
      <Link href={"/templates"}>
        <h3>Click me to view the template list</h3>
      </Link>
      <WorkspaceRenderer pages={pages} />
    </main>
  );
}

export async function generateMetadata() {
  return { title: "Blocksuite Workspace Markdown Reader" };
}

export const revalidate = 60;
