import "./prism.css";

import { omit } from "lodash-es";

import { mdToHTML } from "./md-to-html";
import styles from "./workspace-renderer.module.css";
import Link from "next/link";
import { WorkspacePage, WorkspacePageContent } from "affine-reader/blog";
import { Template } from "affine-reader/template-v2";

export function PageRenderer({
  page,
  style,
}: {
  page: WorkspacePageContent | Template;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <section>
        <legend>metadata</legend>
        <pre
          style={{
            whiteSpace: "pre-wrap",
          }}
        >
          <div>
            <a href={`/api/snapshot?docId=${page.id}`} download>
              Download snapshot
            </a>
          </div>

          <code>
            {JSON.stringify(
              omit(page, ["md", "parsedBlocks", "linkedPages"]),
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
          <pre className={styles.markdown}>{page.md}</pre>
        </article>
        <article className={styles.page}>
          <div dangerouslySetInnerHTML={{ __html: mdToHTML(page.md ?? "") }} />
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
                    href={`${template ? "/templates" : ""}/${page.id}`}
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
