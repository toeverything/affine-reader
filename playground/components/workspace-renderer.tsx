import "./prism.css";

import { omit } from "lodash-es";

import { mdToHTML } from "./md-to-html";
import styles from "./workspace-renderer.module.css";
import Link from "next/link";
import { WorkspacePage, WorkspacePageContent } from "affine-reader/blog";
import { Template } from "affine-reader/template";

export function PageRenderer({
  page,
}: {
  page: WorkspacePageContent | Template;
}) {
  const md = page.md?.replaceAll(
    /\[\]\(LinkedPage:([\w-_]*)\)/g,
    (substr, pageId) => {
      // find the page title
      const linkedPage = page.linkedPages?.find((p) => p.id === pageId);
      if (!linkedPage) {
        return substr;
      }
      return `[${linkedPage.title}(/${linkedPage.slug})](/${linkedPage.id})`;
    }
  );

  const templateId = "templateId" in page ? page.templateId : null;
  return (
    <div>
      <section>
        <legend>metadata</legend>
        <pre
          style={{
            whiteSpace: "pre-wrap",
          }}
        >
          <div>
            <a href={`/api/snapshot?docId=${templateId}`} download>
              Download snapshot
            </a>
          </div>

          <code>
            {JSON.stringify(
              omit(page, ["md", "parsedBlocks", "linkedPages", "properties"]),
              null,
              2
            )}
          </code>

          <h3 style={{ color: page.valid ? "green" : "red" }}>
            {page.valid ? "valid" : "invalid"}
          </h3>
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
  template = false,
}: {
  pages?: WorkspacePage[] | null;
  template?: boolean;
}) {
  return (
    <table>
      <thead>
        <tr>
          <th>Page</th>
          <th>Favorite</th>
          <th>Trashed</th>
          <th>ID</th>
          <th>GUID</th>
          <th>Created At</th>
        </tr>
      </thead>
      <tbody>
        {pages
          ? pages.map((page) => (
              <tr key={page.id}>
                <td>
                  <Link
                    className={styles.pageLink}
                    key={page.id}
                    href={`${template ? "/template" : ""}/${page.id}`}
                    passHref
                  >
                    {page.title || page.id}
                  </Link>
                </td>
                <td>{page.favorite ? "✅" : ""}</td>
                <td>{page.trash ? "✅" : ""}</td>
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
