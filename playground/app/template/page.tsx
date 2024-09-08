import { WorkspaceRenderer } from "@/components";
import { reader } from "@/reader";
import { WorkspacePage } from "affine-reader";
import Link from "next/link";

export default async function TemplatePages() {
  const pages = await reader.getDocPageMetas();
  const templateList = await reader.getTemplateList();
  if (!templateList) {
    return <div>No template list file found</div>;
  }

  const { categories, templateListPageId } = templateList;

  const templateListLink = `https://app.affine.pro/workspace/${process.env.NEXT_PUBLIC_BLOG_WORKSPACE_ID}/${templateList.templateListPageId}`;
  return (
    <main>
      <Link href={"/"}>
        <h3>home</h3>
      </Link>
      <h2>
        Edit template list at{" "}
        <a target="_blank" href={templateListLink}>
          {templateListPageId}
        </a>
      </h2>
      <section>
        The list should have the same order as the templates defined in the
        template list file.
      </section>
      {categories.map((category) => (
        <fieldset
          key={category.category}
          style={{
            padding: 16,
          }}
        >
          <legend>{category.category}</legend>
          <WorkspaceRenderer
            template
            pages={category.list
              .map((t) => {
                return pages?.find((p) => p.id === t.id);
              })
              .filter((p): p is WorkspacePage => p !== undefined)}
          />
          <pre
            style={{
              whiteSpace: "pre-wrap",
            }}
          >
            <code>{category.description}</code>
          </pre>
          <hr />
        </fieldset>
      ))}
    </main>
  );
}

export async function generateMetadata() {
  return { title: "Blocksuite Workspace Markdown Reader" };
}

export const revalidate = 60;
