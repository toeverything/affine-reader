import { blogReader } from "@/reader";
import { WorkspaceRenderer } from "../components";
import Link from "next/link";

export default async function Home() {
  const pages = await blogReader.getDocPageMetas();
  return (
    <main>
      <Link href={"/template"}>
        <h3>templates</h3>
      </Link>
      <WorkspaceRenderer pages={pages} />
    </main>
  );
}

export async function generateMetadata() {
  return { title: "Blocksuite Workspace Markdown Reader" };
}

export const revalidate = 60;
