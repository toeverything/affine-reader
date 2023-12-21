import { getBlocksuiteReader } from "affine-reader";

import "./prism.css";

import { use } from "react";
import { mdToHTML } from "./md-to-html";
import styles from "./workspace-renderer.module.css";
import Link from "next/link";

export function PageRenderer({
  workspaceId,
  id,
}: {
  workspaceId: string;
  id: string;
}) {
  const reader = getBlocksuiteReader({
    workspaceId,
  });
  const page = use(reader.getDocMarkdown(id));

  if (!page) {
    return null;
  }

  return (
    <section className={styles.twoColumnWrapper}>
      <article className={styles.page}>
        <pre className={styles.markdown}>{page.md}</pre>
      </article>
      <article className={styles.page}>
        <div dangerouslySetInnerHTML={{ __html: mdToHTML(page.md) }} />
      </article>
    </section>
  );
}

export function WorkspaceRenderer({ workspaceId }: { workspaceId: string }) {
  const reader = getBlocksuiteReader({
    workspaceId,
  });
  const pages = use(reader.getDocPageMetas());

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
                      href={`/${workspaceId}/${page.guid}`}
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
