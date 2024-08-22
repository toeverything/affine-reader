import "./prism.css";

import { omit } from "lodash-es";

import { mdToHTML } from "./md-to-html";
import styles from "./workspace-renderer.module.css";
import Link from "next/link";
import { WorkspacePage, WorkspacePageContent } from "affine-reader/blog";

export function PageRenderer({ page }: { page: WorkspacePageContent }) {
  const md = page.md?.replaceAll(
    /\[\]\(LinkedPage:([\w-_]*)\)/g,
    (substr, pageId) => {
      // find the page title
      const linkedPage = page.linkedPages?.[pageId];
      if (!linkedPage) {
        return substr;
      }
      return `[${linkedPage.title}(/${linkedPage.slug})](/${linkedPage.id})`;
    }
  );

  return (
    <div>
      <section>
        <legend>Gray Matter</legend>
        <pre>
          {JSON.stringify(
            omit(page, ["md", "parsedBlocks", "linkedPages"]),
            null,
            2
          )}
        </pre>
      </section>
      <section className={styles.twoColumnWrapper}>
        <article className={styles.page}>
          <pre className={styles.markdown}>{md}</pre>
        </article>
        <article className={styles.page}>
          <div dangerouslySetInnerHTML={{ __html: mdToHTML(md ?? "") }} />
        </article>
      </section>
    </div>
  );
}

export function WorkspaceRenderer({
  pages,
}: {
  pages: WorkspacePage[] | null;
}) {
  return (
    <table>
      <thead>
        <tr>
          <th>Page</th>
          <th>Favorite</th>
          <th>ID</th>
          <th>GUID</th>
          <th>Created At</th>
        </tr>
      </thead>
      <tbody>
        {pages
          ? pages
              .filter((p) => !p.trash)
              .map((page) => (
                <tr key={page.id}>
                  <td>
                    <Link
                      className={styles.pageLink}
                      key={page.id}
                      href={`/${page.guid}`}
                      passHref
                    >
                      {page.title}
                    </Link>
                  </td>
                  <td>{page.favorite ? "✅" : ""}</td>
                  <td>{page.id}</td>
                  <td>{page.guid}</td>
                  <td>{new Date(page.createDate).toLocaleString()}</td>
                </tr>
              ))
          : "failed to load pages"}
      </tbody>
    </table>
  );
}
