import { WorkspaceRenderer } from "@/components";
import { blogReader } from "@/reader";
import { WorkspacePage } from "affine-reader";
import Link from "next/link";

export default async function TemplatePages() {
  const pages = await blogReader.getDocPageMetas();
  const templateList = await blogReader.getTemplateList();
  if (!templateList) {
    return <div>No template list file found</div>;
  }
  console.log(templateList.templates.map((t) => t.title));
  const { templates, id } = templateList;
  const templateListLink = `https://app.affine.pro/workspace/${process.env.NEXT_PUBLIC_BLOG_WORKSPACE_ID}/${templateList.id}`;
  return (
    <main>
      <Link href={"/"}>
        <h3>home</h3>
      </Link>
      <h2>
        Edit template list at{" "}
        <a target="_blank" href={templateListLink}>
          {id}
        </a>
      </h2>
      <section>
        The list should have the same order as the templates defined in the
        template list file.
      </section>
      <WorkspaceRenderer
        template
        pages={templates
          .map((t) => {
            return pages?.find((p) => p.id === t.id);
          })
          .filter((p): p is WorkspacePage => p !== undefined)}
      />
    </main>
  );
}

export async function generateMetadata() {
  return { title: "Blocksuite Workspace Markdown Reader" };
}

export const revalidate = 60;
