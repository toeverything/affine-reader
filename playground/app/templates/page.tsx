import { WorkspaceRenderer } from "@/components";
import { reader } from "@/reader";
import { WorkspacePage } from "affine-reader";
import Link from "next/link";
import { use } from "react";

function TemplateList({ categoryPage }: { categoryPage: WorkspacePage }) {
  const category = use(reader.getCategory(categoryPage.id));
  if (!category) {
    return <div>No category found</div>;
  }
  return (
    <fieldset
      key={categoryPage.id}
      style={{
        padding: 16,
      }}
    >
      <legend>{categoryPage.title}</legend>
      <WorkspaceRenderer template pages={category.pages} />
      <pre
        style={{
          whiteSpace: "pre-wrap",
        }}
      >
        <code>{category.description}</code>
      </pre>
      <hr />
    </fieldset>
  );
}

export default async function CategoryList() {
  const categoryList = await reader.getCategoryList();
  if (!categoryList) {
    return <div>No category list file found</div>;
  }

  const templateListLink = `https://app.affine.pro/workspace/${process.env.NEXT_PUBLIC_BLOG_WORKSPACE_ID}/${categoryList.templateListPageId}`;
  return (
    <main>
      <Link href={"/"}>
        <h3>home</h3>
      </Link>
      <h2>
        Edit template list at{" "}
        <a target="_blank" rel="noreferrer" href={templateListLink}>
          {categoryList.templateListPageId}
        </a>
      </h2>
      <section>
        The list should have the same order as the templates defined in the
        template list file.
      </section>
      {categoryList.categoryPages.map((category) => (
        <TemplateList key={category.id} categoryPage={category} />
      ))}
    </main>
  );
}

export async function generateMetadata() {
  return { title: "Blocksuite Workspace Markdown Reader" };
}

export const revalidate = 60;
