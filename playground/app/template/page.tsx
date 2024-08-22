import { WorkspaceRenderer } from "@/components";
import { blogReader } from "@/reader";
import Link from "next/link";

export default async function TemplatePages() {
  const pages = await blogReader.getDocPageMetas();
  const templates = await blogReader.getTemplateList();
  return (
    <main>
      <Link href={"/"}>
        <h3>home</h3>
      </Link>
      <WorkspaceRenderer
        template
        pages={pages?.filter((p) => {
          return templates.some((t) => t.id === p.id);
        })}
      />
    </main>
  );
}

export async function generateMetadata() {
  return { title: "Blocksuite Workspace Markdown Reader" };
}

export const revalidate = 60;
